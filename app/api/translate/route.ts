import { NextRequest, NextResponse } from 'next/server';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

function isArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const totalLetters = (text.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
  return totalLetters > 0 && arabicCount / totalLetters > 0.3;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const target = searchParams.get('target'); // 'ar' or 'en'

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  const langpair = target === 'ar' ? 'en|ar' : 'ar|en';

  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.responseStatus !== 200) {
      return NextResponse.json({ error: 'Translation failed', translatedText: text }, { status: 500 });
    }

    const translatedText = data.responseData?.translatedText || text;
    return NextResponse.json({ translatedText });
  } catch (err) {
    console.error('Translate error:', err);
    return NextResponse.json({ error: 'Translation failed', translatedText: text }, { status: 500 });
  }
}
