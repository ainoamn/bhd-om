import { NextRequest, NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/rate-limit';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const MAX_TEXT_LEN = 2000;

export async function GET(request: NextRequest) {
  const limited = await rateLimitRequest(request, 'translate', 30, 60);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const target = searchParams.get('target');

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: 'Text too long' }, { status: 400 });
  }
  if (target !== 'ar' && target !== 'en') {
    return NextResponse.json({ error: 'Invalid target language' }, { status: 400 });
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
