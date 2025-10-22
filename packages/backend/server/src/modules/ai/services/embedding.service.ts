import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../base/prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly anthropic: Anthropic;
  private readonly chunkSize = 1000; // words per chunk
  private readonly chunkOverlap = 200; // words of overlap

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - embedding features will not work');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'placeholder',
    });
  }

  /**
   * Generate embeddings for a document
   */
  async generateDocumentEmbeddings(documentId: string): Promise<void> {
    this.logger.log(`Generating embeddings for document ${documentId}`);

    try {
      // Get document
      const document = await this.prisma.organizationDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        this.logger.error(`Document ${documentId} not found`);
        return;
      }

      // Delete existing embeddings
      await this.prisma.organizationDocEmbedding.deleteMany({
        where: { documentId },
      });

      // Chunk the document
      const chunks = this.chunkDocument(document.content);

      this.logger.log(`Created ${chunks.length} chunks for document ${documentId}`);

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          // Generate embedding using Anthropic's embeddings model
          // Note: As of now, Anthropic doesn't have a public embeddings API
          // In production, you would use OpenAI's embeddings or another provider
          const embedding = await this.generateEmbedding(chunk);

          // Store embedding in database
          await this.prisma.organizationDocEmbedding.create({
            data: {
              documentId,
              chunkIndex: i,
              chunkText: chunk,
              embedding,
            },
          });

          this.logger.log(`Stored embedding ${i + 1}/${chunks.length} for document ${documentId}`);
        } catch (error) {
          this.logger.error(`Failed to generate embedding for chunk ${i}:`, error);
        }
      }

      this.logger.log(`Successfully generated ${chunks.length} embeddings for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to generate embeddings for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Semantic search across organization documents
   */
  async semanticSearch(
    organizationId: string,
    query: string,
    limit: number = 5
  ): Promise<Array<{ documentId: string; chunkText: string; similarity: number; documentTitle: string }>> {
    this.logger.log(`Semantic search in organization ${organizationId}: "${query}"`);

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Use pgvector for similarity search
      // Note: This uses raw SQL with pgvector operators
      const results = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          e.document_id as "documentId",
          e.chunk_text as "chunkText",
          d.title as "documentTitle",
          1 - (e.embedding <=> $1::vector) as similarity
        FROM organization_doc_embeddings e
        JOIN organization_documents d ON d.id = e.document_id
        WHERE d.organization_id = $2
        ORDER BY e.embedding <=> $1::vector
        LIMIT $3
      `, JSON.stringify(queryEmbedding), organizationId, limit);

      return results.map(row => ({
        documentId: row.documentId,
        chunkText: row.chunkText,
        similarity: parseFloat(row.similarity),
        documentTitle: row.documentTitle,
      }));
    } catch (error) {
      this.logger.error('Semantic search failed:', error);
      throw error;
    }
  }

  /**
   * Get relevant context for a query using RAG
   */
  async getRelevantContext(
    organizationId: string,
    query: string,
    limit: number = 10
  ): Promise<string> {
    const results = await this.semanticSearch(organizationId, query, limit);

    if (results.length === 0) {
      return 'No relevant context found.';
    }

    // Build context from search results
    const context = results
      .map((result, index) => {
        return `## Source ${index + 1}: ${result.documentTitle} (Relevance: ${(result.similarity * 100).toFixed(1)}%)\n\n${result.chunkText}`;
      })
      .join('\n\n---\n\n');

    return context;
  }

  /**
   * Chunk a document into smaller pieces
   */
  private chunkDocument(content: string): string[] {
    const words = content.split(/\s+/);
    const chunks: string[] = [];

    let currentChunk: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < words.length; i++) {
      currentChunk.push(words[i]);
      currentLength++;

      // Create chunk when reaching chunk size
      if (currentLength >= this.chunkSize) {
        chunks.push(currentChunk.join(' '));

        // Start next chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - this.chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart);
        currentLength = currentChunk.length;
      }
    }

    // Add remaining words as final chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  /**
   * Generate embedding for text
   *
   * IMPORTANT: This is a placeholder implementation
   * In production, you should use:
   * - OpenAI's text-embedding-3-large (3072 dimensions)
   * - Voyage AI embeddings
   * - Cohere embeddings
   * - Or another embedding provider
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder: Generate a random 1024-dimensional embedding
    // In production, replace this with actual API call

    this.logger.warn('Using placeholder embeddings - configure embedding provider for production');

    // For demonstration, return a deterministic "embedding" based on text hash
    // This is NOT suitable for production use
    const hash = this.simpleHash(text);
    const embedding = Array.from({ length: 1024 }, (_, i) => {
      return Math.sin(hash + i) * 0.5; // Normalized to [-0.5, 0.5]
    });

    return embedding;

    /* Production implementation would look like:

    // Using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1024,
    });
    return response.data[0].embedding;

    // Or using Voyage AI
    const voyage = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY });
    const response = await voyage.embed({
      input: [text],
      model: 'voyage-2',
    });
    return response.embeddings[0];
    */
  }

  /**
   * Simple hash function for deterministic placeholder embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Batch generate embeddings for multiple documents
   */
  async batchGenerateEmbeddings(documentIds: string[]): Promise<void> {
    this.logger.log(`Batch generating embeddings for ${documentIds.length} documents`);

    for (const documentId of documentIds) {
      try {
        await this.generateDocumentEmbeddings(documentId);
      } catch (error) {
        this.logger.error(`Failed to generate embeddings for document ${documentId}:`, error);
        // Continue with next document
      }
    }

    this.logger.log('Batch embedding generation complete');
  }

  /**
   * Re-index all documents for an organization
   */
  async reindexOrganization(organizationId: string): Promise<void> {
    this.logger.log(`Re-indexing all documents for organization ${organizationId}`);

    const documents = await this.prisma.organizationDocument.findMany({
      where: { organizationId },
      select: { id: true },
    });

    await this.batchGenerateEmbeddings(documents.map(d => d.id));

    this.logger.log(`Re-indexed ${documents.length} documents for organization ${organizationId}`);
  }

  /**
   * Get embedding statistics for organization
   */
  async getEmbeddingStats(organizationId: string): Promise<{
    totalDocuments: number;
    documentsWithEmbeddings: number;
    totalEmbeddings: number;
    averageChunksPerDocument: number;
  }> {
    const [totalDocuments, documentsWithEmbeddings, totalEmbeddings] = await Promise.all([
      this.prisma.organizationDocument.count({
        where: { organizationId },
      }),
      this.prisma.organizationDocument.count({
        where: {
          organizationId,
          embeddings: {
            some: {},
          },
        },
      }),
      this.prisma.organizationDocEmbedding.count({
        where: {
          document: {
            organizationId,
          },
        },
      }),
    ]);

    return {
      totalDocuments,
      documentsWithEmbeddings,
      totalEmbeddings,
      averageChunksPerDocument:
        documentsWithEmbeddings > 0 ? Math.round(totalEmbeddings / documentsWithEmbeddings) : 0,
    };
  }
}
