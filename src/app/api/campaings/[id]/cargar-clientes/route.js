import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { MongoClient } from "mongodb";
require("dotenv").config();

const uri = process.env.DATABASE_URL_MONGODB || "";
const clientPromise = uri ? new MongoClient(uri).connect() : null;

export async function POST(req, context) {
    try {
      console.log("📌 Iniciando carga de clientes...");
  
      const { params } = context;
      if (!params || !params.id) {
        console.error("❌ Error: ID de campaña no válido");
        return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
      }
  
      const campanhaId = Number(params.id);
      if (isNaN(campanhaId)) {
        console.error("❌ Error: El ID de la campaña no es un número válido");
        return NextResponse.json({ error: "El ID de la campaña no es un número válido" }, { status: 400 });
      }
  
      console.log(`✅ ID de campaña recibido: ${campanhaId}`);
  
      const formData = await req.formData();
      const file = formData.get("archivo");
  
      if (!file) {
        console.error("❌ Error: No se proporcionó ningún archivo");
        return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
      }
  
      console.log(`📌 Archivo recibido: ${file.name}`);
  
      const buffer = Buffer.from(await file.arrayBuffer());
      let clientes = [];
  
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        console.log("📌 Procesando archivo Excel...");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        clientes = XLSX.utils.sheet_to_json(sheet);
      } else {
        console.error("❌ Error: Formato de archivo no válido");
        return NextResponse.json({ error: "Formato de archivo no válido. Debe ser .xlsx o .csv" }, { status: 400 });
      }
  
      if (clientes.length === 0) {
        console.error("❌ Error: El archivo está vacío o tiene formato incorrecto");
        return NextResponse.json({ error: "El archivo está vacío o no tiene formato válido" }, { status: 400 });
      }
  
      console.log("📌 Clientes cargados desde archivo:", clientes);

      const clientesProcesados = [];

      // Validar conexión a MongoDB
      if (!clientPromise) {
        console.error("❌ Error: DATABASE_URL_MONGODB no está configurada");
        return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
      }

      const mongoClient = await clientPromise;
      const dbName = process.env.MONGODB_DB;
      if (!dbName) {
        console.error("❌ Error: MONGODB_DB no está configurada");
        return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
      }

      const db = mongoClient.db(dbName);
      const existingClientesMongo = await db.collection("clientes").find({
        celular: { $in: clientes.map(cliente => `+51${String(cliente.Numero || "").trim()}`).filter(n => n !== "+51") }
      }).toArray();
  
      const clienteCeld = existingClientesMongo.map(cliente => cliente.celular);  // Lista de clientes ya existentes en MongoDB.
  
      const promises = clientes.map(async cliente => {
        let { Numero, Nombre, Asesor } = cliente;
        if (!Numero || !Nombre) {
          console.warn("❗ Cliente omitido por datos faltantes:", cliente);
          return;
        }

        // Asegurar que Numero es un string válido
        Numero = String(Numero || "").trim();
        if (!Numero) {
          console.warn("❗ Cliente omitido: número vacío después de procesar");
          return;
        }

        if (!Numero.startsWith("+51")) {
          Numero = `+51${Numero}`;
        }
  
        console.log(`🔍 Buscando cliente con número: ${Numero}`);
  
        // Consultamos si el cliente ya existe en MySQL
        let clienteExistente = await prisma.cliente.findFirst({
          where: { celular: Numero },
        });
  
        // Verificar si el cliente ya existe en MongoDB
        let clienteMongo = existingClientesMongo.find(client => client.celular === Numero);
  
        // Si el cliente NO existe en MySQL, crearlo
        if (!clienteExistente) {
          console.log(`🔹 Cliente no encontrado en MySQL, creando nuevo: ${Nombre}`);
          try {
            clienteExistente = await prisma.cliente.create({
              data: {
                celular: Numero,
                nombre: Nombre,
                documento_identidad: "",
                tipo_documento: "Desconocido",
                estado: "no contactado",
                gestor: Asesor, 
              },
            });
            console.log(`✅ Cliente creado en MySQL con ID: ${clienteExistente.cliente_id}`);
          } catch (err) {
            console.error("❌ Error al crear cliente en MySQL:", err);
            return;
          }
        }
  
        // Si el cliente NO existe en MongoDB, crearlo
        if (!clienteMongo) {
          console.log(`🔹 Cliente no encontrado en MongoDB, creando nuevo: ${Nombre}`);
          try {
            const nuevoClienteMongo = {
              id_cliente: `cli_${clienteExistente.cliente_id}`,
              nombre: Nombre,
              celular: Numero,
              correo: "",
              conversaciones: [], // Inicialmente sin conversaciones
            };
            await db.collection("clientes").insertOne(nuevoClienteMongo);
            console.log(`✅ Cliente creado en MongoDB con ID: cli_${clienteExistente.cliente_id}`);
          } catch (err) {
            console.error("❌ Error al crear cliente en MongoDB:", err);
            return;
          }
        }
  
        // Verificar si el cliente ya está en la campaña
        let clienteCampanhaExistente = await prisma.cliente_campanha.findFirst({
          where: {
            cliente_id: clienteExistente.cliente_id,
            campanha_id: campanhaId,
          },
        });
  
        if (!clienteCampanhaExistente) {
          console.log(`🔹 Cliente ${clienteExistente.cliente_id} no está en la campaña, agregando...`);
          try {
            await prisma.cliente_campanha.create({
              data: {
                cliente_id: clienteExistente.cliente_id,
                campanha_id: campanhaId,
              },
            });
            console.log(`✅ Cliente ${clienteExistente.cliente_id} agregado a campaña ${campanhaId}`);
          } catch (err) {
            console.error("❌ Error al agregar cliente a campaña:", err);
            return;
          }
        }
  
        clientesProcesados.push({
          cliente_id: clienteExistente.cliente_id,
          nombre: clienteExistente.nombre,
          celular: clienteExistente.celular,
          gestor: clienteExistente.gestor
        });
      });
  
      // Esperar que todas las promesas se resuelvan
      await Promise.all(promises);
  
      console.log(`✅ Carga de clientes completada con éxito. Total procesados: ${clientesProcesados.length}`);
  
      return NextResponse.json({
        message: `Clientes procesados con éxito en la campaña ${campanhaId}`,
        clientes: clientesProcesados,
      });
    } catch (error) {
      console.error("❌ Error al cargar clientes:", error);
      return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 });
    }
  }

// 🔹 Obtener clientes de una campaña
export async function GET(req, { params }) {
  try {
    const clientes = await prisma.cliente_campanha.findMany({
      where: { campanha_id: parseInt(params.id) },
      include: { cliente: true },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔹 Eliminar cliente de campaña
export async function DELETE(req, { params }) {
  try {
    const { cliente_id } = await req.json();
    await prisma.cliente_campanha.deleteMany({
      where: { campanha_id: parseInt(params.id), cliente_id },
    });

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}