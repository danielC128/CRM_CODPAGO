import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
//CON CLIENTE_CAMPAGNHA
// export async function GET(req, context) {
//   const params = await context.params; // Extraemos correctamente los params de context
//   console.log("🔹 Params recibidos:", params); // Agrega este log para depuración
//   //const campanhaId = Number(params.id);

//   try {
    
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get("page") || "1", 10);
//     const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

//     // Obtener la campaña con detalles
//     const campanha = await prisma.campanha.findUnique({
//       where: { campanha_id: Number(params.id) },
//       include: {
//         template: { select: { nombre_template: true, mensaje: true } }, // Template
//       },
//     });

//     if (!campanha) {
//       return new Response(JSON.stringify({ error: "Campaña no encontrada" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }

//     // Contar total de clientes en la campaña
//     const totalClientes = await prisma.cliente_campanha.count({
//       where: { campanha_id: parseInt(params.id) },
//     });

//     // Obtener clientes paginados
//     // const clientes = await prisma.cliente_campanha.findMany({
//     //   where: { campanha_id: parseInt(params.id) },
//     //   include: { cliente: {
//     //     include: {
//     //       codigo_pago: { 
//     //         take: 1, // ✅ Solo el código de pago más reciente
//     //         orderBy: { fecha_vencimiento: "desc" }, // ✅ Ordenado por fecha de vencimiento descendente
//     //         select: {
//     //           tipo_codigo: true,
//     //           codigo: true,
//     //           activo: true,
//     //           id_contrato: true,
//     //           fecha_asignacion: true,
//     //           pago_realizado: true,
//     //         }
//     //       }
//     //     }
//     //   } },
//     //   skip: (page - 1) * pageSize,
//     //   take: pageSize,
//     // });

//     const clientes = await prisma.cliente_campanha.findMany({
//       where: { campanha_id: parseInt(params.id) },
//       include: { cliente: true },
//       skip: (page - 1) * pageSize,
//       take: pageSize,
//     });

//     // console.log(
//     //   "Clientes en campaña:",
//     //   clientes.map((c) => ({
//     //     id: c.cliente.cliente_id,
//     //     nombre: `${c.cliente.nombre} ${c.cliente.apellido}`,
//     //     codigo_pago: c.cliente.codigo_pago[0], // Esto imprimirá el array completo
//     //   }))
//     // );
    
//     // Formatear la respuesta
//     // const response = {
//     //   campanha_id: campanha.campanha_id,
//     //   nombre_campanha: campanha.nombre_campanha,
//     //   descripcion: campanha.descripcion || "Sin descripción",
//     //   fecha_creacion: campanha.fecha_creacion,
//     //   fecha_fin: campanha.fecha_fin,
//     //   estado_campanha: campanha.estado_campanha || "Desconocido",
//     //   mensaje_cliente: campanha.mensaje_cliente || "No definido",
//     //   num_clientes: totalClientes, // ✅ Total de clientes
//     //   template: campanha.template
//     //     ? {
//     //         nombre_template: campanha.template.nombre_template,
//     //         mensaje: campanha.template.mensaje,
//     //       }
//     //     : { nombre_template: "No asignado", mensaje: "No definido" },
//     //   clientes: clientes.map((c) => ({
//     //     id: c.cliente.cliente_id, // ✅ ID único del cliente
//     //     documento_identidad: c.cliente.documento_identidad,
//     //     nombreCompleto: `${c.cliente.nombre} ${c.cliente.apellido}`,
//     //     celular: c.cliente.celular,
//     //     fecha_ultima_interaccion: c.cliente.fecha_ultima_interaccion,
//     //     codigo_pago: c.cliente.codigo_pago?.[0]? {
//     //       tipo_codigo: c.cliente.codigo_pago[0].tipo_codigo,
//     //       codigo: c.cliente.codigo_pago[0].codigo,
//     //       id_contrato: c.cliente.codigo_pago[0].id_contrato,
//     //       pago_realizado: c.cliente.codigo_pago[0].pago_realizado  ? "Cancelado" : "Vigente",
//     //     }
//     //   : null, // Si no tiene código de pago, devuelve `null`
//     //   })),
//     //   pagination: {
//     //     total: totalClientes,
//     //     page,
//     //     pageSize,
//     //     totalPages: Math.ceil(totalClientes / pageSize),
//     //   },
//     // };
//     const response = {
//       campanha_id: campanha.campanha_id,
//       nombre_campanha: campanha.nombre_campanha,
//       descripcion: campanha.descripcion || "Sin descripción",
//       fecha_creacion: campanha.fecha_creacion,
//       fecha_fin: campanha.fecha_fin,
//       estado_campanha: campanha.estado_campanha || "Desconocido",
//       mensaje_cliente: campanha.mensaje_cliente || "No definido",
//       num_clientes: totalClientes, // ✅ Total de clientes
//       template: campanha.template
//         ? {
//             nombre_template: campanha.template.nombre_template,
//             mensaje: campanha.template.mensaje,
//           }
//         : { nombre_template: "No asignado", mensaje: "No definido" },
//       clientes: clientes.map((c) => ({
//         id: c.cliente.cliente_id, // ✅ ID único del cliente
//         nombre: c.cliente.nombre,
//         celular: c.cliente.celular,
//         email: c.cliente.email,
//         estado: c.cliente.estado,
//         gestor: c.cliente.gestor,
//         fecha_ultima_interaccion: c.cliente.fecha_ultima_interaccion,
//       })),
//       pagination: {
//         total: totalClientes,
//         page,
//         pageSize,
//         totalPages: Math.ceil(totalClientes / pageSize),
//       },
//     };

//     return new Response(JSON.stringify(response), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("❌ Error en la API de campañas:", error);
//     return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
//       status: 500,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }
// ✅ CON CLIENTE_CAMPANHA (Tabla permanente)
export async function GET(req, context) {
  try {
    const params = await context.params;
    const campanhaId = Number(params.id);
    if (isNaN(campanhaId)) {
      return new Response(JSON.stringify({ error: "ID de campaña no válido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    // Obtener la campaña con detalles
    const campanha = await prisma.campanha.findUnique({
      where: { campanha_id: Number(params.id) },
      include: {
        template: { select: { nombre_template: true, mensaje: true } },
      },
    });

    if (!campanha) {
      return new Response(JSON.stringify({ error: "Campaña no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Contar el total de clientes asociados a la campaña
    const totalClientes = await prisma.cliente_campanha.count({
      where: { campanha_id: campanhaId },
    });

    // Consultar los registros de cliente_campanha con los datos del cliente
    const clientesCampanha = await prisma.cliente_campanha.findMany({
      where: { campanha_id: campanhaId },
      include: {
        cliente: {
          select: {
            cliente_id: true,
            nombre: true,
            apellido: true,
            celular: true,
            email: true,
            documento_identidad: true,
          }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { cliente_campanha_id: "asc" },
    });

    const response = {
      campanha_id: campanhaId,
      num_clientes: totalClientes,
      nombre_campanha: campanha.nombre_campanha,
      descripcion: campanha.descripcion || "Sin descripción",
      fecha_creacion: campanha.fecha_creacion,
      fecha_fin: campanha.fecha_fin,
      estado_campanha: campanha.estado_campanha || "Desconocido",
      mensaje_cliente: campanha.mensaje_cliente || "No definido",
      template: campanha.template
        ? {
            nombre_template: campanha.template.nombre_template,
            mensaje: campanha.template.mensaje,
          }
        : { nombre_template: "No asignado", mensaje: "No definido" },
      clientes: clientesCampanha.map((cc) => ({
        id: cc.cliente.cliente_id,
        nombre: cc.cliente.nombre,
        apellido: cc.cliente.apellido,
        celular: cc.cliente.celular,
        email: cc.cliente.email,
        documento_identidad: cc.cliente.documento_identidad,
        estado_mensaje: cc.estado_mensaje,
        fecha_envio: cc.fecha_envio,
        whatsapp_message_id: cc.whatsapp_message_id,
      })),
      pagination: {
        total: totalClientes,
        page,
        pageSize,
        totalPages: Math.ceil(totalClientes / pageSize),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error al obtener clientes de campaña:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
// 🔹 Agregar cliente a campaña
export async function POST(req, { params }) {
  try {
    const { cliente_id } = await req.json();
    await prisma.cliente_campanha.create({
      data: { campanha_id: parseInt(params.id), cliente_id },
    });

    return NextResponse.json({ message: "Cliente agregado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔹 Eliminar cliente de campaña
export async function DELETE(req, { params }) {
  try {
    const { cliente_id } = await req.json();
    await prisma.campanha_temporal.deleteMany({
      where: { campanha_id: parseInt(params.id)},
    });

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}