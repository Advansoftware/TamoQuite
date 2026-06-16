import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    const existing = await db.systemUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);

    const newUser = await db.systemUser.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash: hash,
        role: 'CLIENT',
        mustChangePassword: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao criar conta' }, { status: 500 });
  }
}
