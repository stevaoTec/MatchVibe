import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'matchvibe.db');

let db: DatabaseSync;

export function getDatabase(): DatabaseSync {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

export function initDatabase(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      cpf TEXT DEFAULT '',
      age INTEGER DEFAULT 18,
      gender TEXT DEFAULT '',
      profilePhoto TEXT DEFAULT '',
      coverPhoto TEXT DEFAULT '',
      photos TEXT DEFAULT '[]',
      interests TEXT DEFAULT '[]',
      verified INTEGER DEFAULT 0,
      googleId TEXT DEFAULT '',
      latitude REAL,
      longitude REAL,
      maxDistance INTEGER DEFAULT 50,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS swipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      swiperId INTEGER NOT NULL,
      swipedId INTEGER NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('like', 'dislike', 'superlike')),
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (swiperId) REFERENCES users(id),
      FOREIGN KEY (swipedId) REFERENCES users(id),
      UNIQUE(swiperId, swipedId)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1Id INTEGER NOT NULL,
      user2Id INTEGER NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user1Id) REFERENCES users(id),
      FOREIGN KEY (user2Id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matchId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (matchId) REFERENCES matches(id),
      FOREIGN KEY (senderId) REFERENCES users(id)
    );
  `);

  // Add columns if missing (migration for existing DBs)
  try { database.exec('ALTER TABLE users ADD COLUMN cpf TEXT DEFAULT ""'); } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN googleId TEXT DEFAULT ""'); } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN latitude REAL'); } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN longitude REAL'); } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN maxDistance INTEGER DEFAULT 50'); } catch {}

  // Seed demo users if database is empty
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    const seedUsers = [
      { 
        email: 'ana@demo.com', name: 'Ana Silva', bio: 'Amo viajar e conhecer pessoas novas', age: 23, gender: 'F', verified: 1,
        interests: ['Viagens', 'Fotografia', 'Cafe', 'Vinho'],
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80']
      },
      { 
        email: 'lucas@demo.com', name: 'Lucas Santos', bio: 'Musico e amante de cafe', age: 25, gender: 'M', verified: 1,
        interests: ['Musica', 'Rock', 'Cafe', 'Academia'],
        photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=80', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&q=80']
      },
      { 
        email: 'maria@demo.com', name: 'Maria Oliveira', bio: 'Fotografa e aventureira', age: 22, gender: 'F', verified: 0,
        interests: ['Aventura', 'Natureza', 'Animais'],
        photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&q=80']
      },
      { 
        email: 'pedro@demo.com', name: 'Pedro Costa', bio: 'Dev por dia, chef por noite', age: 27, gender: 'M', verified: 1,
        interests: ['Tecnologia', 'Culinaria', 'Games', 'Animes'],
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80']
      },
      { 
        email: 'julia@demo.com', name: 'Julia Ferreira', bio: 'Amo praia, sol e boas risadas', age: 24, gender: 'F', verified: 1,
        interests: ['Praia', 'Festas', 'Danca'],
        photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80', 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=500&q=80']
      },
      { 
        email: 'rafael@demo.com', name: 'Rafael Almeida', bio: 'Esportista e nerd nas horas vagas', age: 26, gender: 'M', verified: 0,
        interests: ['Esportes', 'Futebol', 'Games'],
        photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80']
      },
      { 
        email: 'camila@demo.com', name: 'Camila Rodrigues', bio: 'Artista e sonhadora', age: 21, gender: 'F', verified: 1,
        interests: ['Arte', 'Pintura', 'Museus', 'Moda'],
        photos: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=80']
      },
      { 
        email: 'bruno@demo.com', name: 'Bruno Martins', bio: 'Surfista e amante da natureza', age: 28, gender: 'M', verified: 1,
        interests: ['Surf', 'Trilhas', 'Meditacao'],
        photos: ['https://images.unsplash.com/photo-1488161628813-04466f872528?w=500&q=80']
      },
    ];

    const insert = database.prepare(
      'INSERT INTO users (email, password, name, bio, age, gender, profilePhoto, photos, interests, verified, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const user of seedUsers) {
      const avatarUrl = user.photos[0];
      // Generate random coordinates near Sao Paulo (approx -23.5505, -46.6333)
      const lat = -23.5505 + (Math.random() - 0.5) * 0.1;
      const lng = -46.6333 + (Math.random() - 0.5) * 0.1;
      
      insert.run(
        user.email, 
        hashedPassword, 
        user.name, 
        user.bio, 
        user.age, 
        user.gender, 
        avatarUrl,
        JSON.stringify(user.photos),
        JSON.stringify(user.interests),
        user.verified,
        lat,
        lng
      );
    }

    console.log('8 demo users created (password: 123456)');
  }
}
