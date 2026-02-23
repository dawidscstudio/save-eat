import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// UWAGA: Ten tekst wyświetli się w Twoim czarnym terminalu na dole!
console.log("🚨 SERWER WIDZI KLUCZ:", process.env.STRIPE_SECRET_KEY);

// Wracamy do bezpiecznego pobierania z sejfu
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'blik' ,'paypal'],
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: {
              name: 'SaveEat Premium (30 dni)',
              description: 'Nielimitowany skaner paragonów AI i brak limitu punktów.',
            },
            unit_amount: 1999, 
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3000/?success=true',
      cancel_url: 'http://localhost:3000/?canceled=true',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('🚨 Błąd Stripe:', error);
    return NextResponse.json({ error: 'Błąd generowania płatności' }, { status: 500 });
  }
}