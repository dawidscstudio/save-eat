import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    // W prawdziwym, komercyjnym projekcie tu byłoby połączenie z Resend / SendGrid.
    // My udajemy wysłanie, żeby UI poprawnie zadziałało!
    console.log(`[SYMULACJA] E-book został wysłany na adres: ${email}`);

    // Zwracamy status 200 OK, by panel przedni pokazał zielony alert
    return NextResponse.json({ success: true, message: "E-book w drodze!" });
  } catch (error) {
    return NextResponse.json({ error: "Błąd serwera wysyłkowego" }, { status: 500 });
  }
}