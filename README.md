# 🏗️ CasaVidal Backend - Plataforma CRM/ERP

Sistema de gestión integrado para ferretería con IA.

## 🚀 Requisitos

- Node.js 20+
- npm o yarn
- Cuenta en Neon.tech (PostgreSQL)

## 📦 Instalación

1. **Clonar el repositorio:**
```bash
   git clone https://github.com/tu-usuario/casavidal-backend.git
   cd casavidal-backend
```

2. **Instalar dependencias:**
```bash
   npm install
```

3. **Configurar variables de entorno:**
```bash
   cp .env.example .env
```
   
   Luego edita `.env` y configura:
   - `DATABASE_URL`: Tu connection string de Neon.tech
   - `JWT_SECRET`: Un string aleatorio de 32+ caracteres

4. **Generar Prisma Client:**
```bash
   npx prisma generate
```

5. **Ejecutar migraciones:**
```bash
   npx prisma migrate dev
```

6. **Cargar datos de prueba:**
```bash
   npm run prisma:seed
```

## 🏃 Ejecutar en desarrollo
```bash
npm run dev
```

El servidor estará en `http://localhost:3000`

## 👤 Usuarios de prueba

Después del seed, puedes usar:

- **Admin:**
  - Email: `admin@tudominio.com`
  - Password: `admin123`

- **Vendedor:**
  - Email: `vendedor@tudominio.com`
  - Password: `vendedor123`

## 🧪 Probar API

### Login
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@tudominio.com",
  "password": "admin123"
}
```

### Obtener perfil
```bash
GET http://localhost:3000/api/auth/profile
Authorization: Bearer {tu_token}
```

## 📁 Estructura del proyecto
casavidal-backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json

## 🛠️ Scripts disponibles
```bash
npm run dev              # Desarrollo con hot-reload
npm run build            # Compilar TypeScript
npm start                # Producción
npm run prisma:studio    # Abrir GUI de base de datos
npm run prisma:seed      # Cargar datos de prueba
```

## 📝 Licencia

Proyecto de tesis - URBE 2025

## 👥 Autores

- [GUSTAVO VIDAL only]