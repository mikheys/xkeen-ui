import { NextResponse } from 'next/server';
import axios from 'axios';

const cache: { [key: string]: { data: string[], timestamp: number } } = {};
const CACHE_TTL = 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').toLowerCase();
  const type = searchParams.get('type') || 'geosite';

  // Geosite: official community list
  // GeoIP: community source that actually has a file-based tag list we can query
  const repo = type === 'geosite' 
    ? 'v2fly/domain-list-community' 
    : 'Loyalsoldier/geoip';

  try {
    const now = Date.now();
    let files: string[] = [];

    if (cache[repo] && (now - cache[repo].timestamp) < CACHE_TTL) {
      files = cache[repo].data;
    } else {
      const response = await axios.get(`https://api.github.com/repos/${repo}/contents/data`, { 
        timeout: 5000,
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      
      // Map names and remove .txt extension for GeoIP files
      files = response.data.map((file: any) => {
        return type === 'geoip' ? file.name.replace('.txt', '') : file.name;
      });
      
      cache[repo] = { data: files, timestamp: now };
      console.log(`Cache updated for ${repo} (${type})`);
    }

    const filtered = files.filter((f: string) => f.toLowerCase().includes(query));
    return NextResponse.json(filtered.slice(0, 50));
  } catch (error: any) {
    console.error(`GitHub ${type} fetch error:`, error.message);
    if (cache[repo]) {
      return NextResponse.json(cache[repo].data.filter(f => f.toLowerCase().includes(query)).slice(0, 50));
    }
    return NextResponse.json([], { status: 200 });
  }
}
