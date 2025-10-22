import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../base/prisma/prisma.service';
import { OrganizationService } from '../organization/organization.service';
import { UploadOrganizationDocumentInput } from './dto/upload-document.input';
import { UpdateOrganizationDocumentInput } from './dto/update-document.input';
import { OrganizationDocument, Prisma } from '@prisma/client';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private prisma: PrismaService,
    private organizationService: OrganizationService
  ) {}

  /**
   * Upload a new organization document
   */
  async upload(userId: string, input: UploadOrganizationDocumentInput): Promise<OrganizationDocument> {
    // Check permission
    await this.organizationService.checkPermission(
      input.organizationId,
      userId,
      ['owner', 'admin', 'member']
    );

    const document = await this.prisma.organizationDocument.create({
      data: {
        organizationId: input.organizationId,
        title: input.title,
        type: input.type,
        content: input.content,
        metadata: input.metadata || {},
        uploadedBy: userId,
      },
    });

    // Queue embedding generation
    // This will be processed in the background
    this.queueEmbeddingGeneration(document.id);

    return document;
  }

  /**
   * Find document by ID
   */
  async findOne(id: string, userId: string): Promise<OrganizationDocument | null> {
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!document) {
      return null;
    }

    // Check permission
    const isMember = await this.organizationService.isMember(document.organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  /**
   * Find documents by organization
   */
  async findByOrganization(
    organizationId: string,
    userId: string,
    type?: string
  ): Promise<OrganizationDocument[]> {
    // Check permission
    const isMember = await this.organizationService.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const where: Prisma.OrganizationDocumentWhereInput = {
      organizationId,
    };

    if (type) {
      where.type = type;
    }

    return this.prisma.organizationDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update document
   */
  async update(
    id: string,
    userId: string,
    input: UpdateOrganizationDocumentInput
  ): Promise<OrganizationDocument> {
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check permission
    await this.organizationService.checkPermission(
      document.organizationId,
      userId,
      ['owner', 'admin', 'member']
    );

    const updated = await this.prisma.organizationDocument.update({
      where: { id },
      data: {
        title: input.title,
        type: input.type,
        content: input.content,
      },
    });

    // If content changed, regenerate embeddings
    if (input.content) {
      await this.regenerateEmbeddings(id);
    }

    return updated;
  }

  /**
   * Delete document
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const document = await this.prisma.organizationDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check permission
    await this.organizationService.checkPermission(
      document.organizationId,
      userId,
      ['owner', 'admin']
    );

    // Delete embeddings first
    await this.prisma.organizationDocEmbedding.deleteMany({
      where: { documentId: id },
    });

    // Delete document
    await this.prisma.organizationDocument.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Get embeddings count for document
   */
  async getEmbeddingsCount(documentId: string): Promise<number> {
    return this.prisma.organizationDocEmbedding.count({
      where: { documentId },
    });
  }

  /**
   * Search documents by semantic similarity
   * Uses pgvector for vector similarity search
   */
  async semanticSearch(
    organizationId: string,
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<Array<{ document: OrganizationDocument; chunk: string; similarity: number }>> {
    // Check permission
    const isMember = await this.organizationService.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // TODO: Generate query embedding using OpenAI/Anthropic
    // const queryEmbedding = await this.generateEmbedding(query);

    // TODO: Use pgvector for similarity search
    // For now, return empty array as placeholder
    // In production, this would use raw SQL with pgvector operators:
    /*
    const results = await this.prisma.$queryRaw`
      SELECT
        d.*,
        e.chunk_text,
        1 - (e.embedding <=> ${queryEmbedding}::vector) as similarity
      FROM organization_doc_embeddings e
      JOIN organization_documents d ON d.id = e.document_id
      WHERE d.organization_id = ${organizationId}
      ORDER BY e.embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;
    */

    this.logger.warn('Semantic search not yet implemented - requires embedding generation');
    return [];
  }

  /**
   * Get context for AI proposal generation
   * Retrieves relevant documents for a specific purpose
   */
  async getContextForProposal(
    organizationId: string,
    userId: string,
    purpose: string,
    limit: number = 10
  ): Promise<string> {
    // Check permission
    const isMember = await this.organizationService.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Get relevant documents based on type
    const relevantTypes = this.getRelevantDocumentTypes(purpose);

    const documents = await this.prisma.organizationDocument.findMany({
      where: {
        organizationId,
        type: {
          in: relevantTypes,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Combine document content
    const context = documents
      .map((doc) => `# ${doc.title}\n\n${doc.content}`)
      .join('\n\n---\n\n');

    return context;
  }

  /**
   * Queue embedding generation for document
   * In production, this would use BullMQ or similar job queue
   */
  private async queueEmbeddingGeneration(documentId: string): Promise<void> {
    this.logger.log(`Queuing embedding generation for document ${documentId}`);

    // TODO: Implement with BullMQ
    // await this.embeddingQueue.add('generate-embeddings', { documentId });

    // For now, log that this would be queued
    this.logger.warn('Embedding generation queue not yet implemented');
  }

  /**
   * Regenerate embeddings for document
   */
  private async regenerateEmbeddings(documentId: string): Promise<void> {
    this.logger.log(`Regenerating embeddings for document ${documentId}`);

    // Delete old embeddings
    await this.prisma.organizationDocEmbedding.deleteMany({
      where: { documentId },
    });

    // Queue new embedding generation
    await this.queueEmbeddingGeneration(documentId);
  }

  /**
   * Get relevant document types for a given purpose
   */
  private getRelevantDocumentTypes(purpose: string): string[] {
    const typeMapping: Record<string, string[]> = {
      mission: ['mission', 'program_description'],
      impact: ['impact_story', 'annual_report', 'program_description'],
      budget: ['budget', 'annual_report'],
      capacity: ['annual_report', 'program_description'],
      general: ['mission', 'annual_report', 'program_description', 'impact_story'],
    };

    return typeMapping[purpose] || typeMapping.general;
  }

  /**
   * Get document statistics for organization
   */
  async getStats(organizationId: string, userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    totalEmbeddings: number;
  }> {
    // Check permission
    const isMember = await this.organizationService.isMember(organizationId, userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const [total, documents, totalEmbeddings] = await Promise.all([
      this.prisma.organizationDocument.count({
        where: { organizationId },
      }),
      this.prisma.organizationDocument.findMany({
        where: { organizationId },
        select: { type: true },
      }),
      this.prisma.organizationDocEmbedding.count({
        where: {
          document: {
            organizationId,
          },
        },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const doc of documents) {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
    }

    return { total, byType, totalEmbeddings };
  }
}
