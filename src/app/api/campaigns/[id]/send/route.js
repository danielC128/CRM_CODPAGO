// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import clientPromise from "@/lib/mongodb"; // 🔹 Importa la conexión persistente
// import twilio from "twilio";

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// export async function POST(req, { params }) {
//   try {
//     const campaignId = parseInt(params.id, 10);
//     if (isNaN(campaignId)) {
//       return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
//     }

//     // 🔹 Obtener la campaña con su template y clientes asociados
//     const campaign = await prisma.campanha.findUnique({
//       where: { campanha_id: campaignId },
//       include: { template: true, cliente_campanha: { include: { cliente: true } } },    
//     });

//     if (!campaign) {
//       return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
//     }

//     if (!campaign.template || !campaign.template.template_content_sid) {
//       return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
//     }

//     const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
//     const sentMessages = [];

//     // 🔹 Obtener la conexión a MongoDB de clientPromise
//     const mongoClient = await clientPromise;
//     const db = mongoClient.db(process.env.MONGODB_DB);
//     const collection = db.collection("clientes");

//     for (const { cliente } of campaign.cliente_campanha) {
//       if (!cliente || !cliente.celular) {
//         console.warn(`⚠ Cliente ${cliente?.nombre || "Desconocido"} no tiene un número válido.`);
//         continue;
//       }

//       const celularFormatted = `whatsapp:${cliente.celular.trim()}`;
//       const contentSid = campaign.template.template_content_sid;

//       // 🔹 Construir mensaje para Twilio
//       let messagePayload = {
//         from: twilioWhatsAppNumber,
//         to: celularFormatted,
//         contentSid,
//       };

//       if (campaign.template.parametro) {
//         messagePayload.contentVariables = JSON.stringify({
//           1: cliente.nombre, // Variables dinámicas si el template lo requiere
//         });
//       }

//       try {
//         // 📌 Enviar el mensaje con Twilio
//         const message = await client.messages.create(messagePayload);
//         console.log(`📨 Mensaje enviado a ${cliente.celular}: ${message.sid}`);

//         // 📌 Buscar si el cliente ya tiene una conversación en MongoDB
//         const clienteMongo = await collection.findOne({ celular: cliente.celular });

//         if (clienteMongo && clienteMongo.conversaciones.length > 0) {
//           // 🔹 Si ya tiene conversaciones, verificar si hay una activa
//           const tieneConversacionActiva = clienteMongo.conversaciones.some(
//             (conv) => conv.estado === "activa"
//           );

//           if (tieneConversacionActiva) {
//             // 🔹 Si existe, actualizar la conversación activa
//             await collection.updateOne(
//               { celular: cliente.celular, "conversaciones.estado": "activa" },
//               {
//                 $push: {
//                   "conversaciones.$.interacciones": {
//                     fecha: new Date(),
//                     mensaje_chatbot: campaign.template.mensaje,
//                     mensaje_id: message.sid,
//                   },
//                 },
//                 $set: { "conversaciones.$.ultima_interaccion": new Date() },
//               }
//             );
//           } else {
//             // 🔹 Si no hay conversaciones activas, agregar una nueva
//             await collection.updateOne(
//               { celular: cliente.celular },
//               {
//                 $push: {
//                   conversaciones: {
//                     conversacion_id: `conv_${Date.now()}`,
//                     estado: "activa",
//                     ultima_interaccion: new Date(),
//                     interacciones: [
//                       {
//                         fecha: new Date(),
//                         mensaje_chatbot: campaign.template.mensaje,
//                         mensaje_id: message.sid,
//                       },
//                     ],
//                   },
//                 },
//               }
//             );
//           }
//         } else {
//           // 🔹 Si no tiene conversaciones, creamos la estructura completa
//           await collection.updateOne(
//             { celular: cliente.celular },
//             {
//               $set: {
//                 celular: cliente.celular,
//                 conversaciones: [
//                   {
//                     conversacion_id: `conv_${Date.now()}`,
//                     estado: "activa",
//                     ultima_interaccion: new Date(),
//                     interacciones: [
//                       {
//                         fecha: new Date(),
//                         mensaje_chatbot: campaign.template.mensaje,
//                         mensaje_id: message.sid,
//                       },
//                     ],
//                   },
//                 ],
//               },
//             },
//             { upsert: true }
//           );
//         }



//         sentMessages.push({ to: cliente.celular, status: "sent", sid: message.sid });
//       } catch (error) {
//         console.error(`❌ Error al enviar mensaje a ${cliente.celular}:`, error);
//         sentMessages.push({ to: cliente.celular, status: "failed", error: error.message });

//         // 📌 También registrar el intento fallido en MongoDB
//         await collection.updateOne(
//           { celular: cliente.celular },
//           {
//             $push: {
//               conversaciones: {
//                 conversacion_id: `conv_${Date.now()}`,
//                 estado: "fallido",
//                 ultima_interaccion: new Date(),
//                 interacciones: [
//                   {
//                     fecha: new Date(),
//                     mensaje_chatbot: campaign.template.mensaje,
//                     mensaje_id: null,
//                     estado: "fallido",
//                     error: error.message,
//                   },
//                 ],
//               },
//             },
//           },
//           { upsert: true }
//         );
//       }
//     }

//     return NextResponse.json({ success: true, sentMessages });
//   } catch (error) {
//     console.error("❌ Error en el envío de mensajes con Twilio:", error);
//     return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
//   }
// }

// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// //import { db } from "@/lib/firebase"; // 🔹 Importa la conexión a Firestore
//   import admin from "firebase-admin";
// import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
// import twilio from "twilio";

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// // Inicializar Firestore solo si no está inicializado
//   if (!admin.apps.length) {
//     const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),    
//     });
//   }
    
//   const db = admin.firestore();

// export async function POST(req, { params }) {
//   try {
//     const campaignId = parseInt(params.id, 10);
//     if (isNaN(campaignId)) {
//       return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
//     }

//     // 🔹 Obtener la campaña con su template y clientes asociados
//     const campaign = await prisma.campanha.findUnique({
//       where: { campanha_id: campaignId },
//       include: { template: true, cliente_campanha: { include: { cliente: true } } },
//     });

//     if (!campaign) {
//       return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
//     }

//     if (!campaign.template || !campaign.template.template_content_sid) {
//       return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
//     }

//     const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
//     const sentMessages = [];

//     for (const { cliente } of campaign.cliente_campanha) {
//       if (!cliente || !cliente.celular) {
//         console.warn(`⚠ Cliente ${cliente?.nombre || "Desconocido"} no tiene un número válido.`);
//         continue;
//       }

//       const celularFormatted = `whatsapp:${cliente.celular.trim()}`;
//       const contentSid = campaign.template.template_content_sid;
//       const mensajeChatbot = campaign.template.mensaje;

//       // 🔹 Construir mensaje para Twilio
//       let messagePayload = {
//         from: twilioWhatsAppNumber,
//         to: celularFormatted,
//         contentSid,
//       };

//       if (campaign.template.parametro) {
//         messagePayload.contentVariables = JSON.stringify({
//           1: cliente.nombre, // Variables dinámicas si el template lo requiere
//         });
//       }

//       try {
//         // 📌 Enviar el mensaje con Twilio
//         const message = await client.messages.create(messagePayload);
//         console.log(`📨 Mensaje enviado a ${cliente.celular}: ${message.sid}`);

//         // 🔹 Referencia al documento del cliente en Firestore
//         const clienteRef = doc(db, "test", cliente.celular);
//         const clienteSnap = await getDoc(clienteRef);

//         const nuevaInteraccion = {
//           fecha: new Date().toISOString(),
//           mensaje_chatbot: mensajeChatbot,
//           mensaje_id: message.sid,
//         };

//         if (clienteSnap.exists()) {
//           // 📌 Cliente ya existe, revisar si hay conversación activa
//           const clienteData = clienteSnap.data();
//           const conversaciones = clienteData.conversaciones || [];

//           const conversacionActiva = conversaciones.find((conv) => conv.estado === "activa");

//           if (conversacionActiva) {
//             // 🔹 Actualizar conversación activa
//             await updateDoc(clienteRef, {
//               conversaciones: conversaciones.map((conv) =>
//                 conv.estado === "activa"
//                   ? {
//                       ...conv,
//                       ultima_interaccion: new Date().toISOString(),
//                       interacciones: [...conv.interacciones, nuevaInteraccion],
//                     }
//                   : conv
//               ),
//             });
//           } else {
//             // 🔹 No hay conversación activa, agregar nueva
//             await updateDoc(clienteRef, {
//               conversaciones: arrayUnion({
//                 conversacion_id: `conv_${Date.now()}`,
//                 estado: "activa",
//                 ultima_interaccion: new Date().toISOString(),
//                 interacciones: [nuevaInteraccion],
//               }),
//             });
//           }
//         } else {
//           // 📌 Cliente no existe en Firestore, crearlo con la primera conversación
//           await setDoc(clienteRef, {
//             celular: cliente.celular,
//             conversaciones: [
//               {
//                 conversacion_id: `conv_${Date.now()}`,
//                 estado: "activa",
//                 ultima_interaccion: new Date().toISOString(),
//                 interacciones: [nuevaInteraccion],
//               },
//             ],
//           });
//         }

//         sentMessages.push({ to: cliente.celular, status: "sent", sid: message.sid });
//       } catch (error) {
//         console.error(`❌ Error al enviar mensaje a ${cliente.celular}:`, error);
//         sentMessages.push({ to: cliente.celular, status: "failed", error: error.message });

//         // 📌 Guardar intento fallido en Firestore
//         const clienteRef = doc(db, "clientes", cliente.celular);
//         const clienteSnap = await getDoc(clienteRef);

//         const errorInteraccion = {
//           fecha: new Date().toISOString(),
//           mensaje_chatbot: mensajeChatbot,
//           mensaje_id: null,
//           estado: "fallido",
//           error: error.message,
//         };

//         if (clienteSnap.exists()) {
//           await updateDoc(clienteRef, {
//             conversaciones: arrayUnion({
//               conversacion_id: `conv_${Date.now()}`,
//               estado: "fallido",
//               ultima_interaccion: new Date().toISOString(),
//               interacciones: [errorInteraccion],
//             }),
//           });
//         } else {
//           await setDoc(clienteRef, {
//             celular: cliente.celular,
//             conversaciones: [
//               {
//                 conversacion_id: `conv_${Date.now()}`,
//                 estado: "fallido",
//                 ultima_interaccion: new Date().toISOString(),
//                 interacciones: [errorInteraccion],
//               },
//             ],
//           });
//         }
//       }
//     }

//     return NextResponse.json({ success: true, sentMessages });
//   } catch (error) {
//     console.error("❌ Error en el envío de mensajes con Twilio:", error);
//     return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
//   }
// }

// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import admin from "firebase-admin";
// import twilio from "twilio";

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// // Inicializar Firestore solo si no está inicializado
// if (!admin.apps.length) {
//   const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// const db = admin.firestore();

// export async function POST(req, context) {
//   try {
//     //const campaignId = parseInt(params.id, 10);
//     const params = await context.params; // Extraemos correctamente los params de context
//     console.log("🔹 Params recibidos:", params);
//     const campaignId = parseInt(params.id, 10);
//     console.log("camp id send: ", campaignId);
//     if (isNaN(campaignId)) {
//       return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
//     }

//     // 🔹 Obtener la campaña con su template y clientes asociados
//     const campaign = await prisma.campanha.findUnique({
//       where: { campanha_id: campaignId },
//       include: { template: true, cliente_campanha: { include: { cliente: true } } },
//     });

//     if (!campaign) {
//       return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
//     }

//     if (!campaign.template || !campaign.template.template_content_sid) {
//       return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
//     }

//     const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
//     const sentMessages = [];

//     for (const { cliente } of campaign.cliente_campanha) {
//       if (!cliente || !cliente.celular) {
//         console.warn(`⚠ Cliente ${cliente?.nombre || "Desconocido"} no tiene un número válido.`);
//         continue;
//       }

//       const celularFormatted = `whatsapp:${cliente.celular.trim()}`;
//       const contentSid = campaign.template.template_content_sid;
//       const mensajeChatbot = campaign.template.mensaje;

//       // 🔹 Construir mensaje para Twilio
//       let messagePayload = {
//         from: twilioWhatsAppNumber,
//         to: celularFormatted,
//         contentSid,
//       };

//       if (campaign.template.parametro) {
//         messagePayload.contentVariables = JSON.stringify({
//           1: "MAQUI+", // Variables dinámicas si el template lo requiere
//         });
//       }

//       try {
//         // 📌 Enviar el mensaje con Twilio
//         const message = await client.messages.create(messagePayload);
//         console.log(`📨 Mensaje enviado a ${cliente.celular}: ${message.sid}`);

//         // 📌 Guardar mensaje en Firestore como un documento independiente
//         await db.collection("test").add({
//           celular: cliente.celular,
//           fecha: new Date(),
//           id_bot: "codigopago", // Ajusta según corresponda
//           id_cliente: cliente.cliente_id, // Ajusta según corresponda
//           mensaje: mensajeChatbot,
//           sender: false, // 🔹 Mensaje del chatbot
//           //mensaje_id: message.sid,
//         });

//         sentMessages.push({ to: cliente.celular, status: "sent", sid: message.sid });
//       } catch (error) {
//         console.error(`❌ Error al enviar mensaje a ${cliente.celular}:`, error);
//         sentMessages.push({ to: cliente.celular, status: "failed", error: error.message });

//         // 📌 Guardar intento fallido en Firestore
//         // await db.collection("test").add({
//         //   celular: cliente.celular,
//         //   fecha: new Date(),
//         //   id_bot: "codigopago",
//         //   id_cliente: cliente.cliente_id,
//         //   mensaje: mensajeChatbot,
//         //   sender: false,
//         //   estado: "fallido",
//         //   error: error.message,
//         // });
//       }
//     }

//     return NextResponse.json({ success: true, sentMessages });
//   } catch (error) {
//     console.error("❌ Error en el envío de mensajes con Twilio:", error);
//     return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
//   }
// }

//EN PARALELO con cliente campanha


// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import admin from "firebase-admin";
// import twilio from "twilio";

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// // Inicializar Firestore solo si no está inicializado
// if (!admin.apps.length) {
//   const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// const db = admin.firestore();

// export async function POST(req, context) {
//   try {
//     const params = await context.params; // Extraemos correctamente los params de context
//     const campaignId = parseInt(params.id, 10);
//     if (isNaN(campaignId)) {
//       return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
//     }

//     // Obtener la campaña con su template y clientes asociados
//     const campaign = await prisma.campanha.findUnique({
//       where: { campanha_id: campaignId },
//       include: { 
//         template: true, 
//         cliente_campanha: { 
//           include: { cliente: true } 
//         } 
//       },
//     });

//     if (!campaign) {
//       return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
//     }
//     if (!campaign.template || !campaign.template.template_content_sid) {
//       return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
//     }

//     const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

//     // Extraer los clientes que tengan número válido
//     const clientesConNumero = campaign.cliente_campanha
//       .filter(({ cliente }) => cliente && cliente.celular)
//       .map(({ cliente }) => cliente);

//     // Preparar las promesas de envío utilizando .map()
//     const sendMessagePromises = clientesConNumero.map(async (cliente) => {
//       const celularFormatted = `whatsapp:${cliente.celular.trim()}`;
//       const contentSid = campaign.template.template_content_sid;
//       const mensajeChatbot = campaign.template.mensaje;
//       const messagePayload = {
//         from: twilioWhatsAppNumber,
//         to: celularFormatted,
//         contentSid,
//       };

//       if (campaign.template.parametro) {
//         messagePayload.contentVariables = JSON.stringify({
//           1: "MAQUI+",
//         });
//       }

//       try {
//         // Enviar el mensaje con Twilio
//         const message = await client.messages.create(messagePayload);
//         console.log(`Mensaje enviado a ${cliente.celular}: ${message.sid}`);

//         // Guardar el mensaje en Firestore
//         await db.collection("test").add({
//           celular: cliente.celular,
//           fecha: new Date(),
//           id_bot: "codigopago",
//           id_cliente: cliente.cliente_id,
//           mensaje: mensajeChatbot,
//           sender: false,
//         });

//         return { to: cliente.celular, status: "sent", sid: message.sid };
//       } catch (error) {
//         console.error(`Error al enviar mensaje a ${cliente.celular}:`, error);
//         return { to: cliente.celular, status: "failed", error: error.message };
//       }
//     });

//     // Ejecutar todas las promesas en paralelo
//     const sentMessages = await Promise.all(sendMessagePromises);

//     return NextResponse.json({ success: true, sentMessages });
//   } catch (error) {
//     console.error("Error en el envío de mensajes:", error);
//     return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
//   }
// }



 //EN PARALELO CON TEMPORAL SIN PLIMIT
//  import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import admin from "firebase-admin";
// import twilio from "twilio";
// //import pLimit from "p-limit"; // Importamos p-limit

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// // Inicializar Firestore solo si no está inicializado
// if (!admin.apps.length) {
//   const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }
// const db = admin.firestore();
// export async function POST(req, context) {
//   try {
//     const params = await context.params;
//     const campanhaId = Number(params.id);
//     if (isNaN(campanhaId)) {
//       return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
//     }
    
//     // Obtener la campaña con su template
//     const campaign = await prisma.campanha.findUnique({
//       where: { campanha_id: campanhaId },
//       include: { 
//         template: true, 
//       },
//     });

//     if (!campaign) {
//       return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
//     }
//     if (!campaign.template || !campaign.template.template_content_sid) {
//       return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
//     }
    
//     // Obtener los clientes cargados desde el Excel (tabla temporal)
//     const clientes = await prisma.campanha_temporal.findMany({
//       where: { campanha_id: campanhaId },
//     });
//     if (!clientes || clientes.length === 0) {
//       return NextResponse.json({ error: "No hay clientes cargados para esta campaña" }, { status: 400 });
//     }
    
//     // Filtrar clientes que tengan número de celular válido (ya vienen directos con la propiedad 'celular')
//     const clientesConNumero = clientes.filter((clientItem) => clientItem.celular && clientItem.celular.trim() !== "");
    
//     if (clientesConNumero.length === 0) {
//       return NextResponse.json({ error: "No hay clientes con número válido para enviar" }, { status: 400 });
//     }
    
//     const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    
//     // Preparar las promesas de envío utilizando .map() sobre los registros filtrados
//     const sendMessagePromises = clientesConNumero.map(async (clientItem) => {
//       const celularFormatted = `whatsapp:${clientItem.celular.trim()}`;
//       const contentSid = campaign.template.template_content_sid;
//       const mensajeChatbot = campaign.template.mensaje;
//       const messagePayload = {
//         from: twilioWhatsAppNumber,
//         to: celularFormatted,
//         contentSid,
//       };

//       if (campaign.template.parametro) {
//         messagePayload.contentVariables = JSON.stringify({
//           1: "MAQUI+",
//         });
//       }
    
//       try {
//         // Enviar el mensaje con Twilio
//         const message = await client.messages.create(messagePayload);
//         console.log(`Mensaje enviado a ${clientItem.celular}: ${message.sid}`);

//         //guardar el envío para ver cuantos se envían
//         await prisma.campanha_temporal.update({
//           where: { celular: clientItem.celular, campanha_id: campanhaId},
//           data: {
//             twilio_sid: message.sid,
//             estado_envio: message.status,
//             error_codigo: null,
//             error_mensaje: null,
//           },
//         });
//         // Guardar el mensaje en Firestore
//         await db.collection("test").add({
//           celular: clientItem.celular,
//           fecha: new Date(),
//           id_bot: "codigopago",
//           id_cliente: null,
//           mensaje: mensajeChatbot,
//           sender: false,
//         });

//         return { to: clientItem.celular, status: "sent", sid: message.sid };
//       } catch (error) {
//         // Registrar el fallo
//         await prisma.campanha_temporal.update({
//           where: { celular: clientItem.celular, campanha_id: campanhaId },
//           data: {
//             estado_envio: "failed",
//             error_codigo: error.code?.toString(),
//             error_mensaje: error.message,
//           },
//         });

//         console.error(`Error al enviar mensaje a ${clientItem.celular}:`, error);
//         return { to: clientItem.celular, status: "failed", error: error.message };
//       }
//     });

//     //con guardado de estado de mensaje
//     const results = await Promise.allSettled(sendMessagePromises);
//     const sentMessages = results.map((res) =>
//       res.status === "fulfilled" ? res.value : { status: "error", error: res.reason }
//     );
//     return NextResponse.json({ success: true, sentMessages });

//     //sin guardar estado de mensaje 
//     // const sentMessages = await Promise.all(sendMessagePromises);
//     // return NextResponse.json({ success: true, sentMessages });
    
//   } catch (error) {
//     console.error("Error en el envío de mensajes:", error);
//     return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import db from "@/lib/firebase";
import twilio from "twilio";
import pLimit from "p-limit";

// Inicializar client de Twilio
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Inicializar Firestore una sola vez\ if (!admin.apps.length) {
//   const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });

// const db = admin.firestore();

/**
 * Envía un mensaje usando Twilio con retry exponencial ante rate-limit (código 63018).
 */
async function sendWithRetry(payload, retries = 5, delay = 100) {
  try {
    return await client.messages.create(payload);
  } catch (err) {
    if (err.code === 63018 && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return sendWithRetry(payload, retries - 1, delay * 2);
    }
    throw err;
  }
}

export async function POST(req, context) {
  try {
    const params = await context.params;
    const campanhaId = Number(params.id);
    if (isNaN(campanhaId)) {
      return NextResponse.json({ error: "ID de campaña no válido" }, { status: 400 });
    }

    // 1) Obtener la campaña con su template y clientes
    const campaign = await prisma.campanha.findUnique({
      where: { campanha_id: campanhaId },
      include: {
        template: true,
        cliente_campanha: {
          include: { cliente: true },
          where: {
            estado_mensaje: null  // Solo los NO enviados
          }
        }
      },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }
    if (!campaign.template || !campaign.template.template_content_sid) {
      return NextResponse.json({ error: "La campaña no tiene un template válido" }, { status: 400 });
    }

    // 2) Obtener clientes desde cliente_campanha
    if (!campaign.cliente_campanha || campaign.cliente_campanha.length === 0) {
      return NextResponse.json({ error: "No hay clientes pendientes de envío para esta campaña" }, { status: 400 });
    }

    // 3) Filtrar solo clientes con número válido
    const clientesConNumero = campaign.cliente_campanha
      .filter(cc => cc.cliente && cc.cliente.celular && cc.cliente.celular.trim() !== "")
      .map(cc => ({
        cliente_campanha_id: cc.cliente_campanha_id,
        cliente_id: cc.cliente.cliente_id,
        celular: cc.cliente.celular,
        nombre: cc.cliente.nombre,
      }));

    if (clientesConNumero.length === 0) {
      return NextResponse.json({ error: "No hay clientes con número válido para enviar" }, { status: 400 });
    }

    const twilioWhatsAppNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

    // 4) Limitador de concurrencia: solo 5 envíos simultáneos
    const limit = pLimit(5);

    // 5) Mapear envíos usando limit y sendWithRetry
    const sendMessagePromises = clientesConNumero.map(clientItem =>
      limit(async () => {
        const celularFormatted = `whatsapp:${clientItem.celular.trim()}`;
        const payload = {
          from: twilioWhatsAppNumber,
          to: celularFormatted,
          contentSid: campaign.template.template_content_sid,
        };
        if (campaign.template.parametro) {
          payload.contentVariables = JSON.stringify({ 1: "MAQUI+" });
        }

        try {
          const message = await sendWithRetry(payload);
          console.log(`Mensaje enviado a ${clientItem.celular}: ${message.sid}`);

          // 6) Actualizar estado en cliente_campanha y guardar en Firestore
          await prisma.cliente_campanha.update({
            where: { cliente_campanha_id: clientItem.cliente_campanha_id },
            data: {
              whatsapp_message_id: message.sid,
              estado_mensaje: message.status,
              fecha_envio: new Date(),
              fecha_ultimo_estado: new Date(),
            },
          });
          await db.collection("test").add({
            celular: clientItem.celular,
            fecha: new Date(),
            id_bot: "codigopago",
            id_cliente: clientItem.cliente_id,
            mensaje: campaign.template.mensaje,
            sender: false,
          });

          return { to: clientItem.celular, status: "sent", sid: message.sid };
        } catch (error) {
          await prisma.cliente_campanha.update({
            where: { cliente_campanha_id: clientItem.cliente_campanha_id },
            data: {
              estado_mensaje: "failed",
              fecha_envio: new Date(),
              fecha_ultimo_estado: new Date(),
              error_code: error.code?.toString(),
              error_descripcion: error.message,
            },
          });
          console.error(`Error al enviar mensaje a ${clientItem.celular}:`, error);
          return { to: clientItem.celular, status: "failed", error: error.message };
        }
      })
    );

    // 7) Ejecutar todas las promesas y devolver el resultado
    const results = await Promise.allSettled(sendMessagePromises);
    const sentMessages = results.map(r =>
      r.status === "fulfilled" ? r.value : { status: "error", error: r.reason }
    );
    return NextResponse.json({ success: true, sentMessages });
  } catch (error) {
    console.error("Error en el envío de mensajes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
