import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { SuggestionsController } from '../controllers/suggestions.controller';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Sugerencias inteligentes (debe ir antes de /:id para evitar conflicto)
router.get('/suggestions', SuggestionsController.getSuggestions);
router.get('/suggestions/count', SuggestionsController.getSuggestionCount);
router.post('/suggestions/:id/apply', SuggestionsController.applySuggestion);
router.post('/suggestions/:id/dismiss', SuggestionsController.dismissSuggestion);

// Estadísticas de actividades
router.get('/stats', ActivityController.getStats);

// Crear actividad (ADMIN y VENDEDOR)
router.post('/', requireRole('ADMIN', 'VENDEDOR'), ActivityController.createActivity);

// Obtener todas las actividades (con filtros opcionales)
router.get('/', ActivityController.getAllActivities);

// Obtener mis actividades
router.get('/user', ActivityController.getMyActivities);

// Obtener actividades de un cliente específico (Timeline)
router.get('/client/:clientId', ActivityController.getActivitiesByClient);

// Obtener una actividad por ID
router.get('/:id', ActivityController.getActivityById);

// Actualizar actividad (ADMIN y VENDEDOR)
router.put('/:id', requireRole('ADMIN', 'VENDEDOR'), ActivityController.updateActivity);

// Eliminar actividad (ADMIN y VENDEDOR)
router.delete('/:id', requireRole('ADMIN', 'VENDEDOR'), ActivityController.deleteActivity);

export default router;
