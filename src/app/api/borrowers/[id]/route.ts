import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const borrower = await db.borrower.findUnique({
      where: { id },
      include: {
        loans: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
    }

    return NextResponse.json(borrower);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch borrower' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, whatsapp, notes } = body;

    const borrower = await db.borrower.update({
      where: { id },
      data: {
        name,
        whatsapp: whatsapp.replace(/\D/g, ''),
        notes: notes || null,
      },
    });

    return NextResponse.json(borrower);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update borrower' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.borrower.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete borrower' }, { status: 500 });
  }
}