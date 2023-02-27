export interface JobRequestDto {
  context: JobContextDTO;
  message: {
    intent: {
      item: {
        descriptor: {
          name: String;
        };
      };
    };
  };
}

export interface JobContextDTO {
  domain: String;
  country: String;
  city: String;
  action: String;
  core_version: String;
  bap_id: String;
  bap_uri: String;
  bpp_id: String;
  bpp_uri: String;
  transaction_id: String;
  message_id: String;
  timestamp: number;
}

export interface JobContextBPPDTO {
  domain: String;
  country: String;
  city: String;
  action: String;
  core_version: String;
  bap_id: String;
  bap_uri: String;
  bpp_id: string;
  bpp_uri: string;
  transaction_id: String;
  message_id: String;
  timestamp: String;
}

export interface JobResponseFulFillmentDTO {
  id: string;
  start: {
    time: {
      timestamp: string;
    };
  };
}

export interface JobsResponseCategoriesDTO {
  id: string;
  descriptor: {
    code: string;
  };
}

export interface JobsResponseLocationsDTO {
  id: string;
  city: {
    name: string;
  };
}

export interface JobsResponseItemsDTO {
  id: string;
  descriptor: {
    name: string;
  };
  price: {
    currency: string;
    listed_value: string;
    offered_value: string;
    minimum_value: string;
    maximum_value: string;
  };
  category_ids: [string];
  fulfillment_ids: [string];
  location_ids: [string];
  time: {
    range: {
      start: string;
      end: string;
    };
  };
}

export interface JobProviderDto {
  descriptor: {
    name: string;
  };
  categories: [JobsResponseCategoriesDTO];
  locations: [JobsResponseLocationsDTO];
  items: [JobsResponseItemsDTO];
  catalog?: object;
  fulfillments: [JobResponseFulFillmentDTO];
}

export interface JobResponse {
  message: {
    catalog: {
      descriptor: {
        name: string;
      };
      fulfillments: [JobResponseFulFillmentDTO];
      offers: [];
      providers: [JobProviderDto];
    };
  };
}
