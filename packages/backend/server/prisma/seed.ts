import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Comprehensive seed script for Proposal Writing SaaS
 * Creates test data for all entities to enable immediate testing
 */

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing proposal SaaS data...');
  await cleanDatabase();

  // Create test users
  console.log('\n👤 Creating test users...');
  const users = await createUsers();

  // Create organizations
  console.log('\n🏢 Creating organizations...');
  const orgs = await createOrganizations(users);

  // Create workspaces
  console.log('\n📁 Creating workspaces...');
  const workspaces = await createWorkspaces(orgs);

  // Create documents
  console.log('\n📄 Creating organization documents...');
  await createDocuments(orgs, users);

  // Create templates
  console.log('\n📋 Creating proposal templates...');
  const templates = await createTemplates(workspaces);

  // Create grants
  console.log('\n💰 Creating grant opportunities...');
  const grants = await createGrants();

  // Create proposals
  console.log('\n📝 Creating proposals...');
  const proposals = await createProposals(workspaces, templates, grants, users);

  // Create approvals
  console.log('\n✅ Creating approvals...');
  await createApprovals(proposals, users);

  // Create comments
  console.log('\n💬 Creating comments...');
  await createComments(proposals, users);

  console.log('\n✨ Database seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - ${users.length} users`);
  console.log(`   - ${orgs.length} organizations`);
  console.log(`   - ${workspaces.length} workspaces`);
  console.log(`   - ${templates.length} templates`);
  console.log(`   - ${grants.length} grants`);
  console.log(`   - ${proposals.length} proposals`);
  console.log('\n🔑 Login Credentials:');
  console.log('   Email: admin@nonprofit.org');
  console.log('   Password: password123\n');
}

async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  await prisma.proposalComment.deleteMany({});
  await prisma.proposalApproval.deleteMany({});
  await prisma.proposalVersion.deleteMany({});
  await prisma.proposalSection.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.templateSection.deleteMany({});
  await prisma.proposalTemplate.deleteMany({});
  await prisma.organizationDocEmbedding.deleteMany({});
  await prisma.organizationDocument.deleteMany({});
  await prisma.grantOpportunity.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log('   ✓ Cleaned proposal SaaS tables');
}

async function createUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      name: 'Alice Admin',
      email: 'admin@nonprofit.org',
      emailVerifiedAt: new Date(),
    },
    {
      name: 'Bob Manager',
      email: 'bob@nonprofit.org',
      emailVerifiedAt: new Date(),
    },
    {
      name: 'Carol Writer',
      email: 'carol@nonprofit.org',
      emailVerifiedAt: new Date(),
    },
    {
      name: 'David Viewer',
      email: 'david@nonprofit.org',
      emailVerifiedAt: new Date(),
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
      },
    });
    createdUsers.push(user);
    console.log(`   ✓ Created user: ${user.email}`);
  }

  return createdUsers;
}

async function createOrganizations(users: any[]) {
  const orgs = [
    {
      name: 'Green Future Foundation',
      slug: 'green-future',
      taxId: '12-3456789',
      type: 'nonprofit',
      mission: 'Dedicated to environmental conservation and sustainable development through community education and action.',
    },
    {
      name: 'Community Health Alliance',
      slug: 'health-alliance',
      taxId: '98-7654321',
      type: 'nonprofit',
      mission: 'Improving community health outcomes through accessible healthcare services and health education programs.',
    },
  ];

  const createdOrgs = [];
  for (let i = 0; i < orgs.length; i++) {
    const orgData = orgs[i];
    const org = await prisma.organization.create({
      data: orgData,
    });

    // Add organization members
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: users[0].id,
        role: 'owner',
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: users[1].id,
        role: 'admin',
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: users[2].id,
        role: 'member',
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: users[3].id,
        role: 'viewer',
      },
    });

    createdOrgs.push(org);
    console.log(`   ✓ Created organization: ${org.name}`);
  }

  return createdOrgs;
}

async function createWorkspaces(orgs: any[]) {
  const workspaces = [];

  for (const org of orgs) {
    const ws1 = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Grant Applications 2025',
        description: 'Workspace for all grant applications in 2025',
      },
    });
    workspaces.push(ws1);

    const ws2 = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: 'Foundation Grants',
        description: 'Private foundation grant proposals',
      },
    });
    workspaces.push(ws2);

    console.log(`   ✓ Created workspaces for ${org.name}`);
  }

  return workspaces;
}

async function createDocuments(orgs: any[], users: any[]) {
  const documents = [
    {
      title: 'Mission Statement',
      type: 'mission',
      content: `Our mission is to create a sustainable future for all communities through environmental education, conservation efforts, and community engagement. We believe that by empowering individuals with knowledge and resources, we can create lasting positive change for our planet.

Since our founding in 2013, we have:
- Educated over 50,000 community members through workshops and programs
- Planted 100,000 trees across urban and rural areas
- Reduced carbon emissions by 500 tons through our initiatives
- Partnered with 25 local schools to integrate environmental education

Our work is guided by three core principles: sustainability, community engagement, and measurable impact.`,
    },
    {
      title: '2024 Annual Report',
      type: 'annual_report',
      content: `Annual Report 2024

EXECUTIVE SUMMARY
This year marked significant growth for our organization, with program expansion into three new communities and a 40% increase in participants served.

PROGRAMS AND IMPACT
- Community Education: 12,500 participants
- Tree Planting Initiative: 25,000 trees planted
- Youth Environmental Leaders: 500 students trained
- Community Gardens: 15 new gardens established

FINANCIAL OVERVIEW
- Total Revenue: $2.5M
- Program Expenses: $1.8M (72%)
- Administrative: $450K (18%)
- Fundraising: $250K (10%)

LOOKING AHEAD
In 2025, we plan to expand our programs to serve 20,000 participants and launch our climate resilience initiative.`,
    },
    {
      title: 'Program Impact Stories',
      type: 'impact_story',
      content: `IMPACT STORY: Youth Environmental Leaders Program

Maria, a 16-year-old participant in our Youth Environmental Leaders program, transformed her entire school community. After completing our 12-week training, she organized a successful campaign that resulted in her school eliminating single-use plastics.

"This program didn't just teach me about the environment," Maria shares. "It gave me the confidence and tools to actually make a difference in my community."

Maria's project has now expanded to five neighboring schools, preventing an estimated 50,000 plastic bottles from entering landfills annually.

This is just one example of how our programs create ripple effects that extend far beyond individual participants.`,
    },
  ];

  for (const org of orgs) {
    for (const docData of documents) {
      await prisma.organizationDocument.create({
        data: {
          organizationId: org.id,
          title: docData.title,
          type: docData.type,
          content: docData.content,
          uploadedBy: users[0].id,
          metadata: {},
        },
      });
    }
    console.log(`   ✓ Created documents for ${org.name}`);
  }
}

async function createTemplates(workspaces: any[]) {
  const templates = [];

  for (const workspace of workspaces) {
    const template = await prisma.proposalTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: 'Federal Grant Proposal',
        description: 'Standard template for federal government grants',
        category: 'government',
        isPublic: false,
      },
    });

    // Create template sections
    await prisma.templateSection.createMany({
      data: [
        {
          templateId: template.id,
          title: 'Executive Summary',
          description: 'Brief overview of the proposal',
          type: 'text',
          order: 1,
          wordLimit: 500,
          required: true,
          promptGuidance: 'Summarize the key points of your proposal, including the problem, solution, and expected impact.',
        },
        {
          templateId: template.id,
          title: 'Project Description',
          description: 'Detailed description of the proposed project',
          type: 'text',
          order: 2,
          wordLimit: 2000,
          required: true,
          promptGuidance: 'Describe your project in detail, including goals, activities, timeline, and beneficiaries.',
        },
        {
          templateId: template.id,
          title: 'Budget Narrative',
          description: 'Explanation of budget items',
          type: 'budget',
          order: 3,
          required: true,
          promptGuidance: 'Explain each budget line item and how costs were calculated.',
        },
      ],
    });

    templates.push(template);
  }

  console.log(`   ✓ Created ${templates.length} templates`);
  return templates;
}

async function createGrants() {
  const grants = [
    {
      externalId: 'EPA-2025-001',
      source: 'grants_gov',
      title: 'Environmental Education and Outreach Grant',
      funderName: 'Environmental Protection Agency',
      description: 'Funding for community-based environmental education programs that promote environmental stewardship and sustainable practices.',
      eligibility: 'Nonprofit organizations with 501(c)(3) status and at least 3 years of operation. Must serve communities with populations of 10,000 or more.',
      category: ['education', 'environment'],
      keywords: ['environmental education', 'community outreach', 'sustainability', 'climate'],
      minAmount: 50000,
      maxAmount: 250000,
      openDate: new Date('2025-01-01'),
      closeDate: new Date('2025-06-30'),
      url: 'https://grants.gov/example/epa-2025-001',
    },
    {
      externalId: 'HHS-2025-042',
      source: 'grants_gov',
      title: 'Community Health Initiatives Grant',
      funderName: 'Department of Health and Human Services',
      description: 'Support for community health programs addressing chronic disease prevention, health equity, and access to healthcare services.',
      eligibility: 'Nonprofit health organizations serving underserved communities. Must demonstrate partnerships with local healthcare providers.',
      category: ['health', 'community'],
      keywords: ['health equity', 'chronic disease', 'community health', 'prevention'],
      minAmount: 100000,
      maxAmount: 500000,
      openDate: new Date('2025-02-01'),
      closeDate: new Date('2025-07-31'),
      url: 'https://grants.gov/example/hhs-2025-042',
    },
    {
      externalId: 'FOUND-2025-100',
      source: 'foundation_directory',
      title: 'Youth Development and Leadership Grant',
      funderName: 'National Youth Foundation',
      description: 'Grants supporting programs that develop leadership skills in young people ages 13-18 through experiential learning and community service.',
      eligibility: 'Youth-serving nonprofits with demonstrated track record of youth program delivery.',
      category: ['youth', 'education', 'leadership'],
      keywords: ['youth development', 'leadership', 'mentorship', 'community service'],
      minAmount: 25000,
      maxAmount: 100000,
      openDate: new Date('2025-01-15'),
      closeDate: new Date('2025-05-15'),
      url: 'https://foundationdirectory.org/example/youth-grant',
    },
  ];

  const createdGrants = [];
  for (const grantData of grants) {
    const grant = await prisma.grantOpportunity.create({
      data: grantData,
    });
    createdGrants.push(grant);
    console.log(`   ✓ Created grant: ${grant.title}`);
  }

  return createdGrants;
}

async function createProposals(
  workspaces: any[],
  templates: any[],
  grants: any[],
  users: any[]
) {
  const proposals = [];

  for (let i = 0; i < Math.min(workspaces.length, 2); i++) {
    const workspace = workspaces[i];
    const template = templates[i];
    const grant = grants[i];

    const proposal = await prisma.proposal.create({
      data: {
        workspaceId: workspace.id,
        templateId: template.id,
        grantId: grant.id,
        title: `${grant.title.split(' ').slice(0, 4).join(' ')} - Application`,
        clientName: grant.funderName,
        status: 'draft',
        dueDate: grant.closeDate,
        requestedAmount: grant.maxAmount ? grant.maxAmount * 0.8 : 150000,
        createdBy: users[0].id,
        metadata: {
          grantSource: grant.source,
          grantUrl: grant.url,
        },
      },
    });

    // Create proposal sections
    await prisma.proposalSection.createMany({
      data: [
        {
          proposalId: proposal.id,
          title: 'Executive Summary',
          type: 'text',
          content: `This proposal requests funding to expand our environmental education program to serve 5,000 additional community members over the next 18 months. Our proven track record demonstrates significant impact in promoting environmental stewardship and sustainable practices.

Through this grant, we will:
- Expand our successful workshop series to three new communities
- Develop innovative educational materials on climate resilience
- Train 50 community educators to multiply our reach
- Create measurable impact through science-based evaluation

Our organization has successfully delivered environmental education for over 10 years, serving 50,000+ participants with documented behavioral change outcomes.`,
          order: 1,
          wordLimit: 500,
          completedAt: new Date(),
          metadata: {},
        },
        {
          proposalId: proposal.id,
          title: 'Project Description',
          type: 'text',
          content: `PROJECT GOALS
Our project aims to significantly expand environmental literacy in underserved communities through accessible, engaging educational programs.

ACTIVITIES
1. Community Workshop Series (Months 1-18)
   - Monthly workshops covering topics from waste reduction to renewable energy
   - Interactive, hands-on learning experiences
   - Family-friendly formats to engage all ages

2. Educator Training Program (Months 3-12)
   - Recruit and train 50 community educators
   - Provide curriculum materials and teaching resources
   - Ongoing support and professional development

3. Educational Materials Development (Months 1-6)
   - Create culturally relevant, multilingual materials
   - Focus on climate resilience and local environmental issues
   - Digital and print formats for broad accessibility

TIMELINE
Months 1-3: Program setup, educator recruitment
Months 4-15: Full program implementation
Months 16-18: Evaluation and sustainability planning

TARGET POPULATION
We will serve 5,000 individuals in three underserved communities, with focus on families, youth, and community leaders.`,
          order: 2,
          wordLimit: 2000,
          completedAt: new Date(),
          metadata: {},
        },
        {
          proposalId: proposal.id,
          title: 'Budget Narrative',
          type: 'budget',
          content: 'Budget details to be completed...',
          order: 3,
          wordLimit: null,
          completedAt: null,
          metadata: {},
        },
      ],
    });

    proposals.push(proposal);
    console.log(`   ✓ Created proposal: ${proposal.title}`);
  }

  return proposals;
}

async function createApprovals(proposals: any[], users: any[]) {
  for (const proposal of proposals) {
    // Add two approvers
    await prisma.proposalApproval.create({
      data: {
        proposalId: proposal.id,
        approverUserId: users[1].id, // Bob Manager
        status: 'approved',
        comment: 'Great work! The content is compelling and well-structured.',
        respondedAt: new Date(),
      },
    });

    await prisma.proposalApproval.create({
      data: {
        proposalId: proposal.id,
        approverUserId: users[0].id, // Alice Admin
        status: 'pending',
      },
    });

    console.log(`   ✓ Created approvals for proposal: ${proposal.title.substring(0, 40)}...`);
  }
}

async function createComments(proposals: any[], users: any[]) {
  for (const proposal of proposals) {
    const sections = await prisma.proposalSection.findMany({
      where: { proposalId: proposal.id },
      take: 1,
    });

    if (sections.length > 0) {
      await prisma.proposalComment.create({
        data: {
          proposalId: proposal.id,
          sectionId: sections[0].id,
          userId: users[1].id,
          content: 'Consider adding more specific metrics to demonstrate impact. Numbers really help!',
          resolved: false,
        },
      });

      await prisma.proposalComment.create({
        data: {
          proposalId: proposal.id,
          userId: users[2].id,
          content: 'Overall this looks excellent. The narrative is very compelling.',
          resolved: false,
        },
      });

      console.log(`   ✓ Created comments for proposal`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
