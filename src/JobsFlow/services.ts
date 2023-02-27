import axiosInstance from "axios";
import dotenv from "dotenv";
import https from "https";
import {
  buildSelectRequest,
  buildOnSearchMergedResponse,
  buildOnSearchResponse,
  buildSearchResponse,
  buildOnSearchRequest,
  buildSelectResponse,
  buildOnSelectRequest,
  buildOnSelectResponse,
  buildConfirmRequest,
  buildConfirmResponse,
  buildInitRequest,
  buildOnInitRequest,
  buildSearchRequest,
  buildOnConfirmRequest,
  buildInitResponse,
  buildOnInitResponse,
  buildOnConfirmResponse,
  buildStatusRequest,
  buildOnStatusResponse,
  buildOnStatusRequest,
} from "./schema_helper";
import onSelectResponse from "./mock/onSelectResponse.json";
import onSearchResponse from "./mock/onSearchResponse.json";
import onInitResponse from "./mock/onInitResponse.json";
import onConfirmResponse from "./mock/onConfirmResponse.json";
import onStatusResponse from "./mock/onStatusResponse.json";
dotenv.config();
const gatewayUrl = process.env.GATEWAY_URL || "";
const jobNetwork = process.env.JOB_NETWORK;
const backendApiUrl = process.env.BACKEND_API_BASE_URL;

const axios = axiosInstance.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export async function searchJob(body: any): Promise<any> {
  try {
    const { payload, optional } = buildSearchRequest(body);

    let response: any = { data: onSearchResponse };
    if (jobNetwork != "local") {
      const headers = { "Content-Type": "application/JSON" };
      const searchRes = await axios.post(`${gatewayUrl}/search`, payload, {
        headers,
      });

      response = { searchRes };
    }
    return buildOnSearchMergedResponse(response, body);
  } catch (error) {
    return { error: JSON.stringify(error), errorOccured: true };
  }
}

export async function onSearchJob(body: any): Promise<any> {
  try {
    const { payload } = buildOnSearchRequest(body);
    const headers = { "Content-Type": "application/JSON" };

    let response: any = await axios.post(`${gatewayUrl}/on_search`, payload, {
      headers,
    });
    return buildOnSearchResponse(response?.data, body);
  } catch (error) {
    return { error: error, errorOccured: true };
  }
}

export async function selectJob(body: any): Promise<any> {
  try {
    const { payload } = buildSelectRequest(body);
    console.log(JSON.stringify(payload));

    let response: any = { data: onSelectResponse };
    if (jobNetwork != "local") {
      const headers = { "Content-Type": "application/JSON" };
      let res = await axios.post(`${gatewayUrl}/select`, payload, { headers });
      response = res;
    }

    return buildOnSelectResponse(response, body);
  } catch (error: any) {
    return { error: error, errorOccured: true };
  }
}

export async function onSelectJob(body: any) {
  try {
    const { payload } = buildOnSelectRequest(body);
    const headers = { "Content-Type": "application/JSON" };

    let response: any = await axios.post(`${gatewayUrl}/on_select`, payload, {
      headers,
    });
    return buildOnSelectResponse(response?.data, body);
  } catch (error) {
    return { error: error, errorOccured: true };
  }
}

export async function initJob(body: any) {
  try {
    const { payload } = buildInitRequest(body);
    console.log(JSON.stringify(payload));

    let response: any = { data: onInitResponse };
    if (jobNetwork != "local") {
      const headers = { "Content-Type": "application/JSON" };
      let res = await axios.post(`${gatewayUrl}/init`, payload, { headers });
      response = res;
    }
    return buildOnInitResponse(response);
  } catch (error) {
    console.log(error);
    return { error: error, errorOccured: true };
  }
}

export async function onInitJob(body: any) {
  try {
    const { payload } = buildOnInitRequest(body);
    const headers = { "Content-Type": "application/JSON" };

    let response: any = await axios.post(`${gatewayUrl}/on_init`, payload, {
      headers,
    });
    return buildOnInitResponse(response?.data);
  } catch (error) {
    return { error: error, errorOccured: true };
  }
}

export async function confirmJob(body: any): Promise<any> {
  try {
    const { payload } = buildConfirmRequest(body);
    console.log(JSON.stringify(payload));

    let response: any = { data: onConfirmResponse };
    if (jobNetwork != "local") {
      const headers = { "Content-Type": "application/JSON" };
      let res = await axios.post(`${gatewayUrl}/confirm`, payload, { headers });
      response = res;
    }
    return buildOnConfirmResponse(response);
  } catch (error: any) {
    return { error: error, errorOccured: true };
  }
}

export async function onConfirmJob(body: any) {
  try {
    const { payload } = buildOnConfirmRequest(body);
    const headers = { "Content-Type": "application/JSON" };

    let response: any = await axios.post(`${gatewayUrl}/on_confirm`, payload, {
      headers,
    });
    return buildOnConfirmResponse(response.data);
  } catch (error) {
    return { error: error, errorOccured: true };
  }
}

export async function statusJob(body: any) {
  try {
    const { payload } = buildStatusRequest(body);
    console.log(JSON.stringify(payload));

    let response = { data: onStatusResponse };
    if (jobNetwork != "local") {
      const headers = { "Content-Type": "application/JSON" };
      let res = await axios.post(`${gatewayUrl}/status`, payload, { headers });
      response = res;
    }
    return buildOnStatusResponse(response);
  } catch (error: any) {
    return { error: error, errorOccured: true };
  }
}
export async function onStatusJob(body: any) {
  try {
    const { payload } = buildOnStatusRequest(body);
    const headers = { "Content-Type": "application/JSON" };

    let response: any = await axios.post(`${gatewayUrl}/on_status`, payload, {
      headers,
    });
    return buildOnStatusResponse(response.data);
  } catch (error) {
    return { error: error, errorOccured: true };
  }
}
