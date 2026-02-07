# MeritSim - Plataforma Educativa para Exámenes de Estado

Plataforma gamificada para preparación de exámenes de carrera administrativa en Colombia (DIAN, CAR, Acueducto).

## Stack Tecnológico

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI
- **Base de Datos**: PostgreSQL
- **Orquestación**: Docker Compose
- **IA**: Google Gemini API

## Inicio Rápido

```bash
# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## Puertos (Configurables)

| Servicio | Puerto Default | Variable |
|----------|----------------|----------|
| Frontend | 9010 | WEB_PORT |
| Backend  | 9011 | API_PORT |
| PostgreSQL | 5433 | DB_PORT |

## Usuarios Admin Predeterminados

| Email | Rol |
|-------|-----|
| admin@admin.com | ADMIN |
| cmadero08x@gmail.com | ADMIN |
| vpmp24@gmail.com | ADMIN |

## Estructura del Proyecto

```
meritsim/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── main.py
│   ├── models.py
│   ├── seed_init.py
│   └── material_indexer.py
└── frontend/
    ├── Dockerfile
    └── src/
```

## Modos de Estudio

1. **Simulacro**: Examen cronometrado sin feedback hasta el final
2. **Estudio Avanzado**: Feedback inmediato con explicaciones IA

## Material de Estudio

Montar carpeta de PDFs en `./MATERIAL DE ESTUDIO 2026/`
Estructura esperada:
```
MATERIAL DE ESTUDIO 2026/
├── DIAN/
│   └── Gestor I/
│       └── documento.pdf
└── CAR/
    └── Profesional/
        └── normativa.pdf
```
