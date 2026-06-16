import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const borrowers = await db.borrower.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { loans: true },
        },
      },
    });
    return NextResponse.json(borrowers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch borrowers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, whatsapp, notes } = body;

    if (!name || !whatsapp) {
      return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios' }, { status: 400 });
    }

    const borrower = await db.borrower.create({
      data: {
        name,
        whatsapp: whatsapp.replace(/\D/g, ''),
        notes: notes || null,
      },
    });

    return NextResponse.json(borrower, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create borrower' }, { status: 500 });
  }
}