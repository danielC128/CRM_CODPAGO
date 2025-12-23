"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Divider,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Card,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CircularProgress from "@mui/material/CircularProgress";
import axiosInstance from "../../../../services/api";

export default function CampaignPage() {
  /* ────────────────────────────
     ESTADOS
  ──────────────────────────── */
  // Datos básicos de campaña
  const [campaignName, setCampaignName] = useState("");
  
  // Datos de clientes y filtros
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalClients, setTotalClients] = useState(0);

  const [filters, setFilters] = useState({
    estrategia: "",
    categoria_urgencia: "",
    mes_gestion: "",
  });

  // Plantillas
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState("");
  const [placeholders, setPlaceholders] = useState([]);
  const [variableMappings, setVariableMappings] = useState({});

  /* ────────────────────────────
     COLUMNAS DE LA TABLA
  ──────────────────────────── */
  const columns = [
    { field: "dni", headerName: "DNI", width: 100 },
    { field: "nombre", headerName: "Nombre", width: 180 },
    { field: "telefono", headerName: "Teléfono", width: 120 },
    { 
      field: "estrategia", 
      headerName: "Estrategia", 
      width: 110,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'convencional' ? 'error' :
            params.value === 'retadora' ? 'warning' : 'success'
          }
          size="small"
        />
      )
    },
    { 
      field: "categoria_urgencia", 
      headerName: "Categoría Urgencia", 
      width: 160,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'CRITICA' ? 'error' :
            params.value === 'ALTA' ? 'warning' :
            params.value === 'MEDIA' ? 'info' : 'default'
          }
          size="small"
        />
      )
    },
    { 
      field: "score_urgencia", 
      headerName: "Score Urgencia", 
      width: 140,
      type: 'number',
      valueFormatter: (params) => {
        return params.value ? parseFloat(params.value).toFixed(2) : '0.00';
      }
    },
    { field: "mes_gestion", headerName: "Mes Gestión", width: 130 },
    { 
      field: "estado", 
      headerName: "Estado", 
      width: 110,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'ACTIVO' ? 'success' : 'default'}
          size="small"
        />
      )
    },
    { 
      field: "prioridad", 
      headerName: "Prioridad", 
      width: 90,
      type: 'number'
    },
    {
      field: "code_pago",
      headerName: "Códigos de Pago",
      width: 200,
      renderCell: (params) => {
        if (params.value && params.value.trim() !== '') {
          const codigos = params.value.split(',').map(c => c.trim()).filter(Boolean);
          return (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', py: 0.5 }}>
              {codigos.map((codigo, idx) => (
                <Chip
                  key={idx}
                  label={codigo}
                  color="info"
                  size="small"
                  sx={{ fontSize: '0.7rem', height: '20px' }}
                />
              ))}
            </Box>
          );
        }
        return <span style={{ color: '#999', fontSize: '0.85rem' }}>Sin código</span>;
      }
    },
  ];

  /* ────────────────────────────
     CARGAR PLANTILLAS AL INICIO
  ──────────────────────────── */
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axiosInstance.get("/plantillas");
        setTemplates(response.data || []);
        console.log("Plantillas obtenidas:", response.data);
      } catch (error) {
        console.error("Error al obtener plantillas:", error);
      }
    };

    fetchTemplates();
  }, []);

  /* ────────────────────────────
     APLICAR FILTROS
  ──────────────────────────── */
  const applyFilters = async () => {
  if (loading) return;

  console.log("👉 applyFilters ejecutado");
  setLoading(true);

  try {
    const payload = {
      table: "base_filtrada",
      filters: [
        { column: "estrategia", value: filters.estrategia || "" },
        { column: "categoria_urgencia", value: filters.categoria_urgencia || "" },
        { column: "mes_gestion", value: filters.mes_gestion || "" },
      ],
    };

    console.log("Enviando payload:", payload);

    const { data } = await axiosInstance.post("/bigquery/filtrar", payload);
    setClients(data.rows || []);
    setTotalClients(data.rows?.length || 0);
  } catch (error) {
    console.error("Error al filtrar:", error);
    alert("Error al aplicar filtros");
  } finally {
    setLoading(false);
  }
};


  /* ────────────────────────────
     LIMPIAR FILTROS
  ──────────────────────────── */
  const clearFilters = () => {
    setFilters({
      estrategia: "",
      categoria_urgencia: "",
      mes_gestion: "",
    });
    setClients([]);
    setTotalClients(0);
  };

  /* ────────────────────────────
     MANEJAR CAMBIO DE PLANTILLA
  ──────────────────────────── */
  const handleTemplateChange = (event) => {
    const tplId = event.target.value;
    setTemplate(tplId);

    const tpl = templates.find(t => t.id === tplId);
    if (tpl) {
      // Extraer placeholders {{1}}, {{2}}, etc.
      const matches = [...tpl.mensaje.matchAll(/{{\s*(\d+)\s*}}/g)]
                        .map(m => m[1]);
      const uniq = Array.from(new Set(matches));
      setPlaceholders(uniq);
      setVariableMappings({});
    } else {
      setPlaceholders([]);
    }
  };

  /* ────────────────────────────
     CREAR CAMPAÑA
  ──────────────────────────── */
  const handleSubmit = async () => {
    // Validaciones
    if (!campaignName.trim()) {
      alert("Por favor ingresa un nombre para la campaña");
      return;
    }

    if (clients.length === 0) {
      alert("No hay clientes para agregar a la campaña. Aplica filtros primero.");
      return;
    }

    if (!template) {
      alert("Por favor selecciona una plantilla");
      return;
    }

    // Verificar que todas las variables estén mapeadas
    const unmappedVars = placeholders.filter(idx => !variableMappings[idx]);
    if (unmappedVars.length > 0) {
      alert(`Por favor mapea todas las variables: ${unmappedVars.join(", ")}`);
      return;
    }

    const campaignData = {
      nombre_campanha: campaignName,
      descripcion: "Descripción de campaña",
      template_id: template,
      fecha_inicio: new Date(),
      fecha_fin: new Date(),
      clients: clients,
      variableMappings,
    };

    try {
      setLoading(true);
      const response = await axiosInstance.post("/campaings/add-clients", campaignData);
      const campanhaId = response.data.campanha_id;
      
      console.log("Campaña creada con ID:", campanhaId);
      alert("Campaña creada y clientes asociados exitosamente");
      
      // Limpiar formulario
      setCampaignName("");
      setTemplate("");
      setPlaceholders([]);
      setVariableMappings({});
      setClients([]);
      setTotalClients(0);
      setFilters({
        estrategia: "",
        categoria_urgencia: "",
        mes_gestion: "",
      });
    } catch (error) {
      console.error("Error al crear campaña:", error);
      alert("Hubo un problema al crear la campaña: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  /* ────────────────────────────
     ESTILOS
  ──────────────────────────── */
  const colors = {
    primaryBlue: "#007391",
    darkBlue: "#254e59",
    yellowAccent: "#FFD54F",
    lightBlueBg: "#E3F2FD",
    white: "#fff",
  };

  /* ────────────────────────────
     UI
  ──────────────────────────── */
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography 
          variant="h4" 
          mb={3}
          sx={{ 
            color: colors.primaryBlue, 
            fontWeight: "700",
            textAlign: "center" 
          }}
        >
          Crear Campaña - Gestión de Clientes
        </Typography>

        {/* ═══════════════════════════════════════════════════
            SECCIÓN 1: DATOS BÁSICOS DE LA CAMPAÑA
        ═══════════════════════════════════════════════════ */}
        <Typography
          variant="h6"
          sx={{ 
            color: colors.darkBlue, 
            fontWeight: "700", 
            mb: 3, 
            borderBottom: `3px solid ${colors.primaryBlue}`, 
            pb: 1 
          }}
        >
          1. Datos Básicos
        </Typography>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre de la campaña"
              fullWidth
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ej: Campaña Diciembre 2024"
              sx={{ bgcolor: colors.white, borderRadius: 2 }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* ═══════════════════════════════════════════════════
            SECCIÓN 2: FILTROS PARA SELECCIONAR CLIENTES
        ═══════════════════════════════════════════════════ */}
        <Typography
          variant="h6"
          sx={{ 
            color: colors.darkBlue, 
            fontWeight: "700", 
            mb: 3, 
            borderBottom: `3px solid ${colors.primaryBlue}`, 
            pb: 1 
          }}
        >
          2. Filtros de Clientes
        </Typography>

        <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
          <TextField
            select
            label="Estrategia"
            value={filters.estrategia}
            onChange={(e) =>
              setFilters({ ...filters, estrategia: e.target.value })
            }
            sx={{ width: 200 }}
            size="small"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="retadora">Retadora</MenuItem>
            <MenuItem value="convencional">Convencional</MenuItem>
          </TextField>

          <TextField
            select
            label="Categoría Urgencia"
            value={filters.categoria_urgencia}
            onChange={(e) =>
              setFilters({ ...filters, categoria_urgencia: e.target.value })
            }
            sx={{ width: 220 }}
            size="small"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="CRITICA">CRÍTICA</MenuItem>
            <MenuItem value="ALTA">ALTA</MenuItem>
            <MenuItem value="MEDIA">MEDIA</MenuItem>
            <MenuItem value="BAJA">BAJA</MenuItem>
          </TextField>

          <TextField
            type="month"
            label="Mes de gestión"
            InputLabelProps={{ shrink: true }}
            value={filters.mes_gestion}
            onChange={(e) =>
              setFilters({ ...filters, mes_gestion: e.target.value })
            }
            sx={{ width: 200 }}
            size="small"
          />

          <Button 
            variant="contained" 
            onClick={applyFilters}
            disabled={false}
            sx={{ 
              bgcolor: colors.primaryBlue,
              "&:hover": { bgcolor: colors.darkBlue }
            }}
          >
            Aplicar Filtros
          </Button>

          <Button 
            variant="outlined" 
            onClick={clearFilters}
            disabled={loading}
          >
            Limpiar
          </Button>

          {totalClients > 0 && (
            <Chip 
              label={`${totalClients} clientes encontrados`} 
              color="primary" 
              sx={{ ml: 'auto', fontWeight: 600 }}
            />
          )}
        </Box>

        {/* ───── TABLA DE CLIENTES ───── */}
        <Box sx={{ height: 500, width: "100%", mb: 4 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={clients.map((row, idx) => ({
                id: row.dni || idx,
                ...row,
              }))}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              checkboxSelection
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: 'No hay datos para mostrar. Aplica filtros para ver clientes.',
                MuiTablePagination: {
                  labelRowsPerPage: 'Filas por página:',
                }
              }}
            />
          )}
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* ═══════════════════════════════════════════════════
            SECCIÓN 3: PLANTILLA Y VARIABLES
        ═══════════════════════════════════════════════════ */}
        <Typography
          variant="h6"
          sx={{ 
            color: colors.darkBlue, 
            fontWeight: "700", 
            mb: 3, 
            borderBottom: `3px solid ${colors.primaryBlue}`, 
            pb: 1 
          }}
        >
          3. Plantilla de Mensaje
        </Typography>

        <Grid container spacing={3} mb={4}>
          {/* Selector de plantilla */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: colors.darkBlue, fontWeight: 600 }}>
                Seleccionar Plantilla
              </InputLabel>
              <Select
                value={template}
                onChange={handleTemplateChange}
                label="Seleccionar Plantilla"
                sx={{ bgcolor: colors.white, borderRadius: 2 }}
              >
                <MenuItem value="">
                  <em>-- Selecciona una plantilla --</em>
                </MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nombre_template}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Vista previa de la plantilla */}
          {template && (
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  bgcolor: colors.lightBlueBg,
                  p: 3,
                  minHeight: 140,
                  borderRadius: 3,
                  border: `1.5px solid ${colors.primaryBlue}`,
                  boxShadow: `0 4px 12px rgba(0, 115, 145, 0.15)`,
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" mb={1} color={colors.darkBlue}>
                  📱 Vista previa
                </Typography>
                <Typography variant="body1" color={colors.darkBlue}>
                  {templates.find((t) => t.id === template)?.mensaje}
                </Typography>
              </Card>
            </Grid>
          )}

          {/* Mapeo de variables dinámicas */}
          {placeholders.map(idx => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <FormControl fullWidth>
                <InputLabel>Variable {idx}</InputLabel>
                <Select
                  value={variableMappings[idx] || ""}
                  onChange={e =>
                    setVariableMappings(vm => ({ ...vm, [idx]: e.target.value }))
                  }
                  label={`Variable ${idx}`}
                >
                  <MenuItem value="">
                    <em>-- Selecciona campo --</em>
                  </MenuItem>
                  {columns
                    .filter(col => col.field !== 'estrategia' && col.field !== 'categoria_urgencia' && col.field !== 'estado') // Excluir columnas con chips
                    .map(col => (
                      <MenuItem key={col.field} value={col.field}>
                        {col.headerName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* ═══════════════════════════════════════════════════
            SECCIÓN 4: BOTÓN CREAR CAMPAÑA
        ═══════════════════════════════════════════════════ */}
        <Box textAlign="center" mt={4}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={loading || clients.length === 0 || !template || !campaignName.trim()}
            sx={{
              bgcolor: colors.yellowAccent,
              color: colors.darkBlue,
              fontWeight: "700",
              px: 6,
              py: 1.5,
              borderRadius: 3,
              "&:hover": {
                bgcolor: "#FFC107",
              },
              "&:disabled": {
                bgcolor: "#ccc",
                color: "#666"
              }
            }}
          >
            {loading ? "Creando..." : "Crear Campaña"}
          </Button>
          
          {clients.length === 0 && (
            <Typography variant="caption" display="block" mt={2} color="text.secondary">
              💡 Aplica filtros primero para seleccionar clientes
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  );
}