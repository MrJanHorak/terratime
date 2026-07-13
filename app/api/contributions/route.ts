import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const CONTRIBUTIONS_FILE = path.join(DATA_DIR, 'contributions.json');

// Ensure folders exist
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Get all contributions
export async function GET() {
  try {
    ensureDirectories();
    if (!fs.existsSync(CONTRIBUTIONS_FILE)) {
      // Seed with some mock data to show climate impact straight away!
      const mockContributions = [
        {
          id: 'mock-1',
          title: 'Rhone Glacier Retreat (Before)',
          description: 'A historical archive photo of the Rhone Glacier in Switzerland showing extensive ice cover.',
          date: '1900-07-15',
          lat: 46.598,
          lng: 8.384,
          imageUrl: 'https://images.unsplash.com/photo-1548625361-155de0cbb55a?auto=format&fit=crop&w=800&q=80',
          category: 'Glacier Melt',
          author: 'Archive'
        },
        {
          id: 'mock-2',
          title: 'Rhone Glacier Retreat (After)',
          description: 'Modern view of the Rhone Glacier, showing dramatic volume loss and glacial lake formation due to global warming.',
          date: '2020-08-20',
          lat: 46.598,
          lng: 8.384,
          imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
          category: 'Glacier Melt',
          author: 'Researcher'
        },
        {
          id: 'mock-3',
          title: 'Lake Mead Water Depletion (Before)',
          description: 'Water levels at Lake Mead, Nevada, near capacity prior to the prolonged Southwest drought.',
          date: '1985-06-10',
          lat: 36.012,
          lng: -114.737,
          imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
          category: 'Drought',
          author: 'Archive'
        },
        {
          id: 'mock-4',
          title: 'Lake Mead Water Depletion (After)',
          description: 'Lake Mead water levels at historic lows, exposing the "bathtub ring" and illustrating long-term climate pressure.',
          date: '2022-09-01',
          lat: 36.012,
          lng: -114.737,
          imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?auto=format&fit=crop&w=800&q=80',
          category: 'Drought',
          author: 'Local Contributor'
        }
      ];
      fs.writeFileSync(CONTRIBUTIONS_FILE, JSON.stringify(mockContributions, null, 2));
      return NextResponse.json(mockContributions);
    }

    const data = fs.readFileSync(CONTRIBUTIONS_FILE, 'utf-8');
    const contributions = JSON.parse(data);
    return NextResponse.json(contributions);
  } catch (error: any) {
    console.error('Error fetching contributions:', error);
    return NextResponse.json({ error: 'Failed to fetch contributions: ' + error.message }, { status: 500 });
  }
}

// Add a new contribution
export async function POST(request: NextRequest) {
  try {
    ensureDirectories();
    const body = await request.json();
    const { title, description, date, lat, lng, imageBase64, imageName, category, author } = body;

    if (!title || !date || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let imageUrl = '';

    if (imageBase64) {
      // Clean up base64 header if present
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'jpg';

      if (matches && matches.length === 3) {
        extension = matches[1].split('/')[1] || 'jpg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(imageBase64, 'base64');
      }

      // Generate unique name
      const safeName = (imageName || 'upload')
        .replace(/[^a-z0-9.]/gi, '_')
        .toLowerCase();
      const filename = `${Date.now()}_${safeName.includes('.') ? safeName : safeName + '.' + extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filepath, buffer);
      imageUrl = `/uploads/${filename}`;
    } else {
      // Fallback if no image provided (or user supplied a URL directly)
      imageUrl = body.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    }

    const newContribution = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      date,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      imageUrl,
      category: category || 'General',
      author: author || 'Anonymous'
    };

    let contributions = [];
    if (fs.existsSync(CONTRIBUTIONS_FILE)) {
      const data = fs.readFileSync(CONTRIBUTIONS_FILE, 'utf-8');
      contributions = JSON.parse(data);
    }
    
    contributions.push(newContribution);
    fs.writeFileSync(CONTRIBUTIONS_FILE, JSON.stringify(contributions, null, 2));

    return NextResponse.json({ success: true, contribution: newContribution });
  } catch (error: any) {
    console.error('Error adding contribution:', error);
    return NextResponse.json({ error: 'Failed to save contribution: ' + error.message }, { status: 500 });
  }
}
