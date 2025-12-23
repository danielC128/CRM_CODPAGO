import axiosInstance from "./api";
// export const getCampaigns = async (page = 1, pageSize = 10) => {
//   try {
//     const response = await axiosInstance.get(`/campaigns?page=${page}&pageSize=${pageSize}`);
//     return {
//       campaigns: response.data.campaigns || [],
//       totalCount: response.data.totalCount || 0
//     };
//   } catch (error) {
//     console.error("Error al obtener campañas:", error);
//     return { campaigns: [], totalCount: 0 };
//   }
// };

const API_URL = "/campaigns";
const CLOUD_RUN_URL = "https://envios-meta-service-codpago-763512810578.us-west1.run.app";
export const getCampaigns = async (page = 1, pageSize = 10) => {
    const response = await axiosInstance.get(`/campaigns?page=${page}&pageSize=${pageSize}`);
    return response.data;
};

export const getTemplates = async () => {
    const response = await axiosInstance.get("/templates");
    return response.data;
};

export const createCampaign = async (campaignData) => {
  console.log("Base URL:", axiosInstance.defaults.baseURL);
  console.log("Endpoint:", "/campaigns");

  return await axiosInstance.post("/campaigns", {
      nombre_campanha: campaignData.nombre_campanha,
      descripcion: campaignData.descripcion,
      template_id: campaignData.template_id, // 📌 Asegurar que es un número
      fecha_fin: campaignData.fecha_fin || null, // 📌 Asegurar que sea null si no tiene fecha
  });
};

// export const uploadClients = async (campaignId) => {
//   // const formData = new FormData();
//   // formData.append("archivo", file);

//   return await axiosInstance.post(`/campaigns/${campaignId}/cargar-clientes`,{
//       headers: { "Content-Type": "multipart/form-data" },
//   });
// };
export const uploadClients = async (campaignId, file) => {
  const formData = new FormData();
  formData.append("archivo", file);

  return await axiosInstance.post(`/campaigns/${campaignId}/cargar-clientes`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
  });
};

export const sendCampaign = async (campaignId) => {
    return await axiosInstance.post(`${API_URL}/${campaignId}/enviar`);
};

export const deleteCampaign = async (campaignId) => {
    return await axiosInstance.delete(`${API_URL}/${campaignId}`);
};

// 🔹 Obtener detalle de una campaña con clientes paginados
export const getCampaignById = async (id, page = 1, pageSize = 10) => {
    const response = await axiosInstance.get(`/campaigns/${id}/clientes`, {
      params: { page, pageSize },
    });
    return response.data;
  };

// 🔹 Eliminar un cliente de una campaña
export const removeClientFromCampaign = async (id, clientId) => {
    const response = await axiosInstance.delete(`/campaigns/${id}/clientes`, {
      data: { cliente_id: clientId },
    });
    return response.data;
  };
  

  export const updateCampaign = async (campaignId, campaignData) => {
    try {
      const response = await axiosInstance.put(`/campaigns/${campaignId}`, campaignData);
      return response.data;
    } catch (error) {
      console.error("❌ Error al actualizar campaña:", error);
      throw new Error(error.response?.data?.error || "Error al actualizar la campaña");
    }
  };

  export const getGestores = async () => {
    try {
      const response = await axiosInstance.get("/gestores");
      return response.data;
    } catch (error) {
      console.error("Error al obtener gestores:", error);
      return [];
    }
  };


  export const sendCampaignMessages = async (campaignId) => {
  try {
    const response = await fetch(`${CLOUD_RUN_URL}/api/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        campaignId: campaignId,
        callbackUrl: `${window.location.origin}/api/campaigns/${campaignId}/callback`
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error al enviar campaña via Cloud Function:", error);
    throw error;
  }
};
