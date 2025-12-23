import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const {
      nombre_campanha,
      descripcion,
      template_id,
      fecha_inicio,
      fecha_fin,
      clients,
      variableMappings,
    } = await req.json();

    // Validar que haya clientes
    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { error: "No hay clientes para agregar a la campaña" },
        { status: 400 }
      );
    }

    console.log(`📋 Creando campaña "${nombre_campanha}" con ${clients.length} clientes`);

    // 1. Preparar datos de la campaña
    const campanhaData = {
      nombre_campanha,
      descripcion: descripcion || "Sin descripción",
      fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : new Date(),
      fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
      variable_mappings: variableMappings || {},
      estado_campanha: "activa", // ✅ Minúscula según tu schema
      num_clientes: clients.length,
      tipo: "in", // ✅ Valor por defecto según tu schema
    };

    // 🔹 Conectar template si existe (usando relación, no campo directo)
    if (template_id) {
      campanhaData.template = {
        connect: { id: parseInt(template_id) }
      };
    }

    // Crear la campaña
    const campanha = await prisma.campanha.create({
      data: campanhaData,
    });

    console.log(`✅ Campaña creada con ID: ${campanha.campanha_id}`);

    // 2. Normalizar y preparar datos de clientes
    const clientesNormalizados = clients
      .map((cliente) => {
        // Normalizar el número de teléfono
        let celular = cliente.celular || cliente.telefono || "";

        if (celular) {
          // Convertir a string y remover espacios
          celular = celular.toString().replace(/\s+/g, "").trim();

          // Agregar +51 si no tiene prefijo
          if (!celular.startsWith("+")) {
            celular = `+51${celular}`;
          }
        }

        return {
          ...cliente,
          celular_normalizado: celular,
          nombre: cliente.nombre || cliente.Nombre || null,
        };
      })
      .filter((c) => c.celular_normalizado); // ✅ Solo clientes con celular válido

    console.log(`📞 Clientes válidos con celular: ${clientesNormalizados.length}`);

    // 3. Crear/buscar clientes en tabla `cliente` y asociarlos en `cliente_campanha`
    let clientesCreados = 0;
    let clientesExistentes = 0;
    let asociacionesCreadas = 0;

    for (const clienteData of clientesNormalizados) {
      try {
        // 3.1 Buscar si el cliente ya existe por celular
        let clienteDB = await prisma.cliente.findFirst({
          where: { celular: clienteData.celular_normalizado },
        });

        if (!clienteDB) {
          // 3.2 Si no existe, crear nuevo cliente
          clienteDB = await prisma.cliente.create({
            data: {
              nombre: clienteData.nombre || "Sin nombre",
              apellido: "", // Campo requerido, vacío por defecto
              celular: clienteData.celular_normalizado,
              email: null,
              documento_identidad: clienteData.dni || null,
              estado: "activo",
            },
          });
          clientesCreados++;
          console.log(`✅ Cliente creado: ${clienteDB.celular}`);
        } else {
          clientesExistentes++;
          console.log(`ℹ️ Cliente existente: ${clienteDB.celular}`);
        }

        // 3.3 Crear asociación en cliente_campanha
        await prisma.cliente_campanha.create({
          data: {
            cliente_id: clienteDB.cliente_id,
            campanha_id: campanha.campanha_id,
            estado_mensaje: null, // Pendiente de envío
            fecha_asociacion: new Date(),
          },
        });
        asociacionesCreadas++;

      } catch (error) {
        console.error(`❌ Error procesando cliente ${clienteData.celular_normalizado}:`, error);
        // Continuar con el siguiente cliente
      }
    }

    console.log(`✅ Clientes creados: ${clientesCreados}`);
    console.log(`ℹ️ Clientes existentes: ${clientesExistentes}`);
    console.log(`✅ Asociaciones creadas en cliente_campanha: ${asociacionesCreadas}`);

    // 4. Retornar respuesta exitosa
    return NextResponse.json({
      success: true,
      message: "Campaña creada y clientes asociados exitosamente",
      campanha_id: campanha.campanha_id,
      estadisticas: {
        clientes_nuevos: clientesCreados,
        clientes_existentes: clientesExistentes,
        asociaciones_creadas: asociacionesCreadas,
      },
      campanha: {
        campanha_id: campanha.campanha_id,
        nombre_campanha: campanha.nombre_campanha,
        descripcion: campanha.descripcion,
        estado_campanha: campanha.estado_campanha,
        num_clientes: campanha.num_clientes,
        fecha_inicio: campanha.fecha_inicio,
        fecha_fin: campanha.fecha_fin,
      },
    });

  } catch (error) {
    console.error("❌ Error al crear campaña:", error);
    console.error("❌ Detalles:", error.message);

    return NextResponse.json(
      {
        error: "Error al crear la campaña o agregar los clientes",
        details: error.message,
      },
      { status: 500 }
    );
  }
}