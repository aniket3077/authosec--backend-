import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Clerk Webhook Handler
 * Syncs user data from Clerk to our database
 */

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Error verifying webhook' },
      { status: 400 }
    );
  }

  // Handle the webhook
  const eventType = evt.type;

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;

      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;

      case 'organization.created':
        await handleOrganizationCreated(evt.data);
        break;

      case 'organization.updated':
        await handleOrganizationUpdated(evt.data);
        break;

      case 'organizationMembership.created':
        await handleOrganizationMembershipCreated(evt.data);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json(
      { message: 'Webhook processed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handleUserCreated(data: any) {
  const { id, email_addresses, phone_numbers, first_name, last_name, image_url } = data;

  await prisma.user.create({
    data: {
      clerkId: id,
      email: email_addresses[0]?.email_address,
      phone: phone_numbers[0]?.phone_number,
      firstName: first_name,
      lastName: last_name,
      imageUrl: image_url,
      role: UserRole.ACCOUNT_USER,
    },
  });

  console.log('User created:', id);
}

async function handleUserUpdated(data: any) {
  const { id, email_addresses, phone_numbers, first_name, last_name, image_url } = data;

  await prisma.user.update({
    where: { clerkId: id },
    data: {
      email: email_addresses[0]?.email_address,
      phone: phone_numbers[0]?.phone_number,
      firstName: first_name,
      lastName: last_name,
      imageUrl: image_url,
    },
  });

  console.log('User updated:', id);
}

async function handleUserDeleted(data: any) {
  const { id } = data;

  await prisma.user.update({
    where: { clerkId: id },
    data: { isActive: false },
  });

  console.log('User deactivated:', id);
}

async function handleOrganizationCreated(data: any) {
  const { id, name, slug, image_url } = data;

  await prisma.company.create({
    data: {
      clerkOrgId: id,
      name: name,
      slug: slug,
      logo: image_url,
    },
  });

  console.log('Organization created:', id);
}

async function handleOrganizationUpdated(data: any) {
  const { id, name, slug, image_url } = data;

  await prisma.company.update({
    where: { clerkOrgId: id },
    data: {
      name: name,
      slug: slug,
      logo: image_url,
    },
  });

  console.log('Organization updated:', id);
}

async function handleOrganizationMembershipCreated(data: any) {
  const { organization, public_user_data } = data;

  // Find user and company
  const user = await prisma.user.findUnique({
    where: { clerkId: public_user_data.user_id },
  });

  const company = await prisma.company.findUnique({
    where: { clerkOrgId: organization.id },
  });

  if (user && company) {
    // Assign user to company
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    });

    console.log('User assigned to organization:', user.id, company.id);
  }
}
