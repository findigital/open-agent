#!/usr/bin/env ts-node

/**
 * CLI Script: Generate Embeddings for Organization Documents
 *
 * Usage:
 *   yarn ts-node scripts/generate-embeddings.ts [organizationId]
 *   yarn ts-node scripts/generate-embeddings.ts --all
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateEmbeddings(organizationId?: string) {
  console.log('🔄 Generating embeddings for organization documents...\n');

  try {
    let documents;

    if (organizationId) {
      documents = await prisma.organizationDocument.findMany({
        where: { organizationId },
        include: { organization: true },
      });
      console.log(`📄 Found ${documents.length} documents in organization ${organizationId}`);
    } else {
      documents = await prisma.organizationDocument.findMany({
        include: { organization: true },
      });
      console.log(`📄 Found ${documents.length} documents across all organizations`);
    }

    if (documents.length === 0) {
      console.log('⚠️  No documents found. Run seed script first: yarn prisma db seed');
      return;
    }

    console.log('\n⚠️  NOTE: This is a placeholder implementation.');
    console.log('   In production, configure OPENAI_API_KEY or VOYAGE_API_KEY');
    console.log('   to generate real embeddings.\n');

    for (const doc of documents) {
      console.log(`Processing: ${doc.title} (${doc.type})`);
      console.log(`  Organization: ${doc.organization.name}`);
      console.log(`  Content length: ${doc.content.length} characters`);

      // Placeholder: In production, call EmbeddingService.generateDocumentEmbeddings(doc.id)
      console.log(`  ✓ Would generate embeddings (placeholder mode)\n`);
    }

    console.log('✅ Embedding generation complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Set OPENAI_API_KEY in your .env file');
    console.log('   2. Update embedding.service.ts with real API call');
    console.log('   3. Run this script again to generate real embeddings');

  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const organizationId = args[0] !== '--all' ? args[0] : undefined;

generateEmbeddings(organizationId);
