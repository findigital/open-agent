import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service';
import { UploadOrganizationDocumentInput } from './dto/upload-document.input';
import { UpdateOrganizationDocumentInput } from './dto/update-document.input';
import { OrganizationDocument } from '@prisma/client';

// Placeholder guard
const AuthGuard = function () {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    return descriptor;
  };
};

@Resolver('OrganizationDocument')
@UseGuards(AuthGuard)
export class DocumentResolver {
  constructor(private documentService: DocumentService) {}

  // ============================================================================
  // Queries
  // ============================================================================

  @Query('organizationDocument')
  async organizationDocument(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<OrganizationDocument | null> {
    const userId = context.req.user.id;
    return this.documentService.findOne(id, userId);
  }

  @Query('organizationDocuments')
  async organizationDocuments(
    @Args('organizationId') organizationId: string,
    @Args('type') type: string | undefined,
    @Context() context: any
  ): Promise<OrganizationDocument[]> {
    const userId = context.req.user.id;
    return this.documentService.findByOrganization(organizationId, userId, type);
  }

  @Query('organizationDocumentStats')
  async organizationDocumentStats(
    @Args('organizationId') organizationId: string,
    @Context() context: any
  ): Promise<any> {
    const userId = context.req.user.id;
    return this.documentService.getStats(organizationId, userId);
  }

  // ============================================================================
  // Mutations
  // ============================================================================

  @Mutation('uploadOrganizationDocument')
  async uploadOrganizationDocument(
    @Args('input') input: UploadOrganizationDocumentInput,
    @Context() context: any
  ): Promise<OrganizationDocument> {
    const userId = context.req.user.id;
    return this.documentService.upload(userId, input);
  }

  @Mutation('updateOrganizationDocument')
  async updateOrganizationDocument(
    @Args('id') id: string,
    @Args('input') input: UpdateOrganizationDocumentInput,
    @Context() context: any
  ): Promise<OrganizationDocument> {
    const userId = context.req.user.id;
    return this.documentService.update(id, userId, input);
  }

  @Mutation('deleteOrganizationDocument')
  async deleteOrganizationDocument(
    @Args('id') id: string,
    @Context() context: any
  ): Promise<boolean> {
    const userId = context.req.user.id;
    return this.documentService.delete(id, userId);
  }

  // ============================================================================
  // Computed Fields
  // ============================================================================

  @ResolveField('embeddingsCount')
  async embeddingsCount(@Parent() document: OrganizationDocument): Promise<number> {
    return this.documentService.getEmbeddingsCount(document.id);
  }
}
