import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const VALID_PILLARS = ['GROWTH', 'STABILITY', 'ESSENTIAL', 'REWARD'];

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, accounts, categories, debts, goals, today } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'El texto no puede estar vacío' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build context about user's accounts, categories, etc.
    const accountsList = (accounts || []).map((a: any) =>
      `- ID: "${a.id}", Nombre: "${a.name}", Tipo: ${a.type}, Moneda: ${a.currency}, Saldo: ${a.balance}`
    ).join('\n');

    const categoriesList = (categories || []).map((c: any) =>
      `- ID: "${c.id}", Nombre: "${c.name}", Icono: ${c.icon}, Tipo: ${c.type}`
    ).join('\n');

    const debtsList = (debts || []).map((d: any) => {
      if (d.isCreditCard) {
        return `- ID: "${d.id}", Nombre: "${d.name}", Es Tarjeta de Crédito: sí, Moneda: ${d.currency}, Últimos 4 dígitos: ${d.lastFourDigits || 'N/A'}`;
      }
      if (d.isLent) {
        return `- ID: "${d.id}", Nombre: "${d.name}", Es Préstamo (Me deben): sí, Moneda: ${d.currency}`;
      }
      return `- ID: "${d.id}", Nombre: "${d.name}", Es Deuda: sí, Moneda: ${d.currency}`;
    }).join('\n');

    const goalsList = (goals || []).map((g: any) =>
      `- ID: "${g.id}", Nombre: "${g.name}", Moneda: ${g.currency}`
    ).join('\n');

    const systemPrompt = `Eres un asistente financiero especializado en parsear texto libre en español (Perú) para extraer transacciones financieras.

CONTEXTO DEL USUARIO:
Fecha de hoy: ${today || new Date().toISOString().split('T')[0]}

CUENTAS DEL USUARIO:
${accountsList || 'No tiene cuentas registradas'}

CATEGORÍAS DISPONIBLES:
Categorías de gasto predefinidas:
- ID: "food", Nombre: "Alimentación", Icono: 🍔
- ID: "transport", Nombre: "Transporte", Icono: 🚗
- ID: "entertainment", Nombre: "Entretenimiento", Icono: 🎬
- ID: "health", Nombre: "Salud", Icono: 🏥
- ID: "education", Nombre: "Educación", Icono: 📚
- ID: "shopping", Nombre: "Compras", Icono: 🛍️
- ID: "bills", Nombre: "Servicios", Icono: 📄
- ID: "housing", Nombre: "Vivienda", Icono: 🏠
- ID: "other", Nombre: "Otro", Icono: 📌

Fuentes de ingreso predefinidas:
- ID: "salary", Nombre: "Sueldos", Icono: 💼
- ID: "clinton-rent", Nombre: "Cajamarca cuartos (Alquileres)", Icono: 🏠
- ID: "other-income", Nombre: "Otro ingreso", Icono: 💰

Categorías personalizadas del usuario:
${categoriesList || 'Ninguna'}

DEUDAS Y TARJETAS DE CRÉDITO:
${debtsList || 'Ninguna'}

METAS DE AHORRO:
${goalsList || 'Ninguna'}

INSTRUCCIONES:
1. Parsea el texto del usuario y extrae TODAS las transacciones mencionadas.
2. Para cada transacción, determina:
   - type: EXPENSE, INCOME, TRANSFER, PAY_DEBT, PAY_CREDIT_CARD, SAVE_FOR_GOAL, o RECEIVE_DEBT_PAYMENT
   - amount: El monto numérico
   - description: Breve descripción del gasto/ingreso
   - date: La fecha en formato YYYY-MM-DD. Si el usuario dice "hoy" usa ${today}. Si dice "ayer", usa el día anterior. Si dice "lunes", calcula la fecha del último lunes. Si no menciona fecha, usa "${today}".
   - categoryId: El ID de la categoría más apropiada de las listadas arriba
   - accountId: El ID de la cuenta mencionada. Si el usuario menciona un nombre de cuenta/banco/billetera, busca la coincidencia en las cuentas del usuario. Si NO menciona ninguna cuenta, deja accountId como null (el usuario la seleccionará manualmente).
   - Si es TRANSFER: incluye fromAccountId (cuenta origen) y accountId (cuenta destino)
   - Si es PAY_DEBT o PAY_CREDIT_CARD: incluye debtId
   - Si es SAVE_FOR_GOAL: incluye goalId
   - pillar (regla 25/15/50/10), obligatorio para EXPENSE, PAY_DEBT y SAVE_FOR_GOAL; null para los demás tipos:
     * "ESSENTIAL": lo necesario para vivir y trabajar (supermercado, mercado, servicios, luz, agua, internet, pasajes, salud, vivienda, cuotas de deudas)
     * "REWARD": gustos y disfrute (restaurantes, salidas, delivery, cine, viajes, regalos, compras no necesarias)
     * "GROWTH": lo que aumenta tu valor o ingresos (cursos, libros, inversiones, gastos de tu negocio o emprendimiento)
     * "STABILITY": fondo de emergencia y ahorro de seguridad (SAVE_FOR_GOAL normalmente va aquí)
     Decide por el contexto, no solo por la categoría: "almuerzo con amigos" es REWARD aunque sea comida; "mercado" es ESSENTIAL.
   - confidence: 0-1 qué tan seguro estás del parseo
   - aiNote: Solo si hay ambigüedad o algo que aclarar

3. Cuando el usuario dice "con la tarjeta" o "con la BBVA" o similar, busca la tarjeta de crédito correspondiente:
   - Si paga CON la tarjeta de crédito (compra algo), es EXPENSE y el accountId es el ID de la tarjeta de crédito
   - Si paga A la tarjeta de crédito (abona deuda), es PAY_CREDIT_CARD

4. Para montos: "25", "25 soles", "S/25", "S/ 25.50" son en PEN. "$25", "25 dólares" son en USD.

5. IMPORTANTE: Si el usuario NO especifica una cuenta, deja accountId como null. No inventes ni asumas una cuenta.

RESPONDE SOLO con un JSON válido (sin markdown, sin backticks), con esta estructura exacta:
{
  "transactions": [
    {
      "amount": 25.00,
      "description": "Uber",
      "date": "2026-05-18",
      "type": "EXPENSE",
      "categoryId": "transport",
      "accountId": null,
      "fromAccountId": null,
      "debtId": null,
      "goalId": null,
      "pillar": "ESSENTIAL",
      "confidence": 0.95,
      "aiNote": null
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTEXTO DEL USUARIO:\n"${text}"` }]
        }
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    });

    const responseText = response.text?.trim() || '';

    // Try to parse the JSON response
    let parsed;
    try {
      // Remove potential markdown code block wrapper
      const cleanedText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleanedText);
    } catch {
      console.error('Failed to parse Gemini response:', responseText);
      return NextResponse.json(
        { error: 'La IA no pudo parsear las transacciones. Intenta de nuevo con una descripción más clara.', raw: responseText },
        { status: 422 }
      );
    }

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      return NextResponse.json(
        { error: 'Respuesta de la IA no tiene el formato esperado' },
        { status: 422 }
      );
    }

    // Add temporary IDs for UI tracking
    const transactions = parsed.transactions.map((tx: any, index: number) => ({
      ...tx,
      id: `ai-${Date.now()}-${index}`,
      amount: Number(tx.amount) || 0,
      pillar: VALID_PILLARS.includes(tx.pillar) ? tx.pillar : undefined,
      confidence: Number(tx.confidence) || 0.5,
    }));

    return NextResponse.json({ transactions });

  } catch (error: any) {
    console.error('Error in parse-transactions API:', error);
    return NextResponse.json(
      { error: `Error del servidor: ${error.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}
