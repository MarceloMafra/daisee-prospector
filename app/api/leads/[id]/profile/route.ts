import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'O arquivo deve ser um PDF' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 5MB)' }, { status: 413 })
    }

    // Extract text from PDF
    const buffer = await file.arrayBuffer()
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(Buffer.from(buffer))
    const profileText = pdfData.text?.trim()

    if (!profileText || profileText.length < 50) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto do PDF. Verifique se o arquivo é válido.' },
        { status: 400 }
      )
    }

    // Save to database
    await prisma.lead.update({
      where: { id: params.id },
      data: {
        profileText,
        profileUrl: file.name,
      },
    })

    return NextResponse.json({
      success: true,
      textLength: profileText.length,
      preview: profileText.substring(0, 200) + '...',
      message: 'Perfil do LinkedIn extraído com sucesso',
    })
  } catch (error) {
    console.error('Erro ao processar PDF:', error)
    return NextResponse.json(
      { error: 'Falha ao processar o PDF. Tente novamente.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    await prisma.lead.update({
      where: { id: params.id },
      data: { profileText: null, profileUrl: null },
    })

    return NextResponse.json({ success: true, message: 'Perfil removido com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao remover perfil' }, { status: 500 })
  }
}
