
import moment from "moment";
import { v4 as uuid } from "uuid";
export const buildContext = (input: any = {}) => {
    return {
        domain: process.env.DOMAIN + input?.category,
        action: input?.action ?? "",
        // location: { city: { code: process.env.CITY || (input?.city ?? "") }, country: { code: process.env.COUNTRY || (input?.country ?? "") } },
        version: process.env.CORE_VERSION || (input?.core_version ?? ""),
        bap_id: process.env.BAP_ID ?? input?.bapId,
        bap_uri: process.env.BAP_URI ?? input?.bapUri,
        bpp_id: input?.bppId,
        bpp_uri: input?.bppUri,
        transaction_id: input?.transactionId ?? uuid(),
        message_id: input?.messageId ?? uuid(),
        timestamp: input.timestamp ?? moment().toISOString(),
        ttl: "P1M",
    }
}

export const isAcknowledged = (input: any = {}) => {
    return (input?.message?.ack?.status === "ACK")
}

export const buildSearchRequest = (input: any = {}) => {
    const context = buildContext({ category: 'jobs', action: 'search' });
    const intent: any = {};
    const optional: any = {};
    if (input?.title?.key) {
        intent.item = { "descriptor": { "name": input?.title?.key } }
    }

    if (input?.company?.name) {
        intent.provider = { "descriptor": { "name": input?.company?.name } }
    }

    if (input?.company?.locations) {
        intent.provider = {
            ...(intent?.provider ?? {}),
            locations: input?.company?.locations?.map((name: any) => {
                return { city: { name: name.city } }
            })
        }
    }

    if (input?.loggedInUserEmail) {
        optional.user = { "email": input?.loggedInUserEmail };
    }

    if (input?.skills?.length) {
        intent.fulfillment = { customer: { person: { skills: input?.skills } } };
    }

    const message = { intent: intent };
    return { payload: { context, message }, optional };
}

export const buildSearchResponse = (input: any = {}, body: any = {}) => {
    const { transaction_id: transactionId, message_id: messageId, bpp_id: bppId, bpp_uri: bppUri }: any = input;
    const context = { transactionId, messageId, bppId, bppUri };

    return { data: { context } };
}

export const buildOnSearchRequest = (input: any = {}) => {
    const context = buildContext({ category: 'jobs', action: 'on_search', transactionId: input?.transactionId, messageId: input?.messageId, });
    const message = {};

    return { payload: { context, message } };
}

export const buildOnSearchMergedResponse = async (response: any = {}, body: any = {}) => {
    return buildOnSearchResponse(response.searchRes, body, response?.itemRes?.[0]?.data?.jobs, response?.itemRes?.[1]?.data?.jobs);
}

export const buildOnSearchResponse = (response: any = {}, body: any = {}, savedItems = [], appliedItems = []) => {
    const input = response?.data?.responses?.[0];
    if (!input)
        return { status: 200 };
    const { transaction_id: transactionId, message_id: messageId, bpp_id: bppId, bpp_uri: bppUri }: any = input?.context ?? {};
    const context = { transactionId, messageId, bppId, bppUri };

    const providers = input?.message?.catalog?.providers;

    const jobProviderPlatform = input?.message?.catalog?.descriptor?.name;

    const jobResults = providers?.map((provider: any) => {
        return ({
            company: {
                id: provider?.id,
                name: provider?.descriptor?.name,
                imageLink: provider?.descriptor?.images?.map((image: any) => ({ url: image?.url, size: image?.size_type }))
            },
            jobs: provider?.items?.map((item: any) => ({
                jobId: item?.id,
                role: item?.descriptor?.name,
                description: item?.descriptor?.long_desc,
                additionalDesc: { url: item?.descriptor?.additional_desc?.url, contentType: item?.descriptor?.additional_desc?.content_type },
                userSavedItem: !!(savedItems?.find((savedItem: any) => savedItem?.job_id == item?.id)),
                userAppliedItem: !!(appliedItems?.find((appliedItem: any) => appliedItem?.job_id == item?.id)),
                locations: provider?.locations
                    ?.filter((location: any) => item?.location_ids?.find((id: any) => id == location?.id))
                    ?.map((location: any) => ({
                        id: location?.id,
                        city: location?.city?.name,
                        cityCode: location?.city?.code,
                        state: location?.state?.name,
                        country: location?.country?.name,
                        countryCode: location?.country?.code
                    })),
            })),
        });
    });

    return { data: { context, jobProviderPlatform, jobResults } };
}

export const buildSavedAppliedJobResonse = (savedResponse: any = {}, appliedResponse: any = {}) => {
    const savedInput = savedResponse?.data?.jobs;
    const appliedInput = appliedResponse?.data?.jobs;

    const jobMap: any = {
        saved: {}, applied: {}
    };

    if (savedResponse?.data) {
        savedInput.forEach(({ job_id }: any) => {
            jobMap['saved'][job_id] = true;
        });
    }

    if (appliedResponse?.data) {
        appliedInput.forEach(({ job_id }: any) => {
            jobMap['applied'][job_id] = true;
        });
    }

    return jobMap;
}

export const buildSelectRequest = (input: any = {}) => {

    const context = buildContext({
        category: "jobs",
        action: 'select',
        bppId: input?.context?.bppId,
        bppUri: input?.context?.bppUri,
        transactionId: input?.context?.transactionId,
    });
    const message = {
        order: {
            provider: { id: input?.companyId },
            items: [
                { id: input?.jobs?.jobId }
            ]
        }
    }

    return { payload: { context, message } }
}

export const buildSelectResponse = (input: any = {}, body: any = {}) => {
    const { transaction_id: transactionId, message_id: messageId, bpp_id: bppId, bpp_uri: bppUri }: any = input;
    const context = { transactionId, messageId, bppId, bppUri };

    return { data: { context, message: input?.message } };
}

export const buildOnSelectRequest = (input: any = {}) => {
    const context = buildContext({ transactionId: input.transaction_id, messageId: input.message_id, bppId: input.bpp_id, bppUri: input.bpp_uri });
    const message = {};
    return { payload: { context, message } };
}

export const buildOnSelectResponse = (response: any = {}, body: any = {}) => {
    const input = response?.data?.responses?.[0];
    if (!input)
        return { status: 200 };
    const { transaction_id: transactionId, bpp_id: bppId, bpp_uri: bppUri }: any = input?.context ?? {};
    const context = { transactionId, bppId, bppUri };

    const provider = input?.message?.order?.provider;
    const items = input?.message?.order?.items;


    const company = {
        id: provider?.id,
        name: provider?.descriptor?.name,
        imageLink: provider?.descriptor?.images?.map((image: any) => ({ url: image?.url, size: image?.size_type }))
    }

    const selectedJobs: any[] = [];
    items?.forEach((item: any) => {
        const job: any = {
            jobId: item?.id,
            role: item?.descriptor?.name,
            description: item?.descriptor?.long_desc,
            additionalDesc: { url: item?.descriptor?.additional_desc?.url, contentType: item?.descriptor?.additional_desc?.content_type },
            locations: provider?.locations
                ?.filter((location: any) => item?.location_ids?.find((locationId: any) => location.id == locationId))

                ?.map((location: any) => ({
                    id: location?.id,
                    city: location?.city?.name,
                    cityCode: location?.city?.code,
                    state: location?.state?.name,
                    country: location?.country?.name,
                    countryCode: location?.country?.code
                })),
            fulfillmentCategory: provider.fulfillments
                ?.filter((fulfillment: any) => item?.fulfillment_ids?.find((fulfillmentId: any) => fulfillment?.id == fulfillmentId))
                ?.map((fulfillment: any) => fulfillment),

            educationalQualifications: item?.tags
                ?.filter((tag: any) => tag?.descriptor?.name?.toLowerCase()?.includes('qualifications'))
                ?.map((tag: any) => ({
                    category: tag?.descriptor?.name,
                    qualification: tag?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
                }))
        };

        const workExperience = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "work experience");
        const responsibilities = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "responsibilities");
        const employmentInformation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "employment-info");
        const compensation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "salary-info");

        job.workExperience = {
            key: workExperience?.descriptor?.name,
            experience: workExperience?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
        }
        job.responsibilities = responsibilities?.list?.map((li: any) => li.value)
        job.employmentInformation = {
            code: employmentInformation?.descriptor?.code,
            name: employmentInformation?.descriptor?.name,
            employmentInfo: employmentInformation?.list?.map((li: any) => ({
                code: li?.descriptor?.code,
                name: li?.descriptor?.name,
                value: li?.value
            }))
        }
        job.compensation = {
            code: compensation?.descriptor?.code,
            name: compensation?.descriptor?.name,
            salaryInfo: compensation?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value })),
        }

        job.additionalFormUrl = item?.xinput?.form?.url

        selectedJobs.push(job);
    });

    return { data: { context, company, selectedJobs } };
}


export const buildInitRequest = (input: any) => {
    const context = buildContext({
        category: "jobs",
        action: 'init',
        bppId: input?.context?.bppId,
        bppUri: input?.context?.bppUri,
        transactionId: input?.context?.transactionId,
    });
    const message = {
        order: {
            provider: { id: input?.companyId },
            items: [
                { id: input?.jobs?.jobId }
            ],
            fulfillments: input?.jobFulfillments?.map((data: any) => {
                return {
                    id: data?.JobFulfillmentCategoryId,
                    customer: {
                        person: {
                            name: data?.jobApplicantProfile?.name,
                            languages: data?.jobApplicantProfile?.languages?.map((language: any) => {
                                return { code: language }
                            }),
                            URL: data?.jobApplicantProfile?.profileUrl,
                            creds: data?.jobApplicantProfile?.creds?.map((data: any) => {
                                return { url: data?.url, type: data?.type }
                            }),
                            skills: data?.jobApplicantProfile?.skills?.map((skill: any) => {
                                return { name: skill }
                            }),
                        }
                    }
                }
            }),
            xinput: {
                submission_id: input?.additionalFormData?.submissionId,
                data: Object.fromEntries(input?.additionalFormData?.data?.map((formData: any) => [formData?.formInputKey, formData?.formInputValue]) ?? [])
            }
        },
    }
    return { payload: { context, message } }
}

export const buildInitResponse = (input: any = {}, body: any = {}) => {
    return { data: { input } };
}

export const buildOnInitRequest = (input: any = {}) => {
    const context = buildContext({ category: 'jobs', action: 'on_init', transactionId: input?.transactionId, messageId: input?.messageId, bppId: input?.bppId, bppUri: input?.bppUri });
    const message = {};

    return { payload: { context, message } };
}

export const buildOnInitResponse = (response: any = {}) => {
    const input = response?.data?.responses?.[0];
    if (!input)
        return { status: 200 };
    const { transaction_id: transactionId, message_id: messageId, bpp_id: bppId, bpp_uri: bppUri }: any = input?.context ?? {};
    const context = { transactionId, messageId, bppId, bppUri };

    const provider = input?.message?.order?.provider;
    const items = input?.message?.order?.items;
    const xinput = input?.message?.order?.xinput;

    const company = {
        id: provider?.id,
        name: provider?.descriptor?.name,
        imageLink: provider?.descriptor?.images?.map((image: any) => ({ url: image?.url, size: image?.size_type }))
    }

    const initiatedJobs: any[] = [];
    items?.forEach((item: any) => {
        const job: any = {
            jobId: item?.id,
            role: item?.descriptor?.name,
            description: item?.descriptor?.long_desc,
            additionalDesc: { url: item?.descriptor?.additional_desc?.url, contentType: item?.descriptor?.additional_desc?.content_type },
            locations: provider?.locations
                ?.filter((location: any) => item?.location_ids?.find((locationId: any) => location.id == locationId))

                ?.map((location: any) => ({
                    id: location?.id,
                    city: location?.city?.name,
                    cityCode: location?.city?.code,
                    state: location?.state?.name,
                    country: location?.country?.name,
                    countryCode: location?.country?.code
                })),
            fulfillmentCategory: item?.fulfillments
                ?.filter((fulfillment: any) => item?.fulfillment_ids?.find((fulfillmentId: any) => fulfillment?.id == fulfillmentId))
                ?.map((fulfillment: any) => fulfillment),

            educationalQualifications: item?.tags
                ?.filter((tag: any) => tag?.descriptor?.name?.toLowerCase()?.includes('qualifications'))
                ?.map((tag: any) => ({
                    category: tag?.descriptor?.name,
                    qualification: tag?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
                }))
        };

        const responsibilities = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "responsibilities");

        const workExperience = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "work experience");
        const employmentInformation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "employment-info");
        const compensation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "salary-info");

        job.responsibilities = responsibilities?.list?.map((li: any) => li.value)

        job.workExperience = {
            key: workExperience?.descriptor?.name,
            experience: workExperience?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
        }
        job.employmentInformation = {
            code: employmentInformation?.descriptor?.code,
            name: employmentInformation?.descriptor?.name,
            employmentInfo: employmentInformation?.list?.map((li: any) => ({
                code: li?.descriptor?.code,
                name: li?.descriptor?.name,
                value: li?.value
            }))
        }
        job.compensation = {
            code: compensation?.descriptor?.code,
            name: compensation?.descriptor?.name,
            salaryInfo: compensation?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value })),
        }

        initiatedJobs.push(job);
    });

    const jobFulfillments = input?.message?.order?.fulfillments.map((fulfilment: any) => ({
        jobFulfillmentCategoryId: fulfilment?.id,
        jobApplicantProfile: {
            name: fulfilment?.customer?.person?.name,
            language: fulfilment?.customer?.person?.languages?.map((language: any) => language?.code),
            profileUrl: fulfilment?.customer?.person?.url,
            creds: fulfilment?.customer?.person?.creds,
            skills: fulfilment?.customer?.person?.skills?.map((skill: any) => skill?.name)
        }
    }));

    const additionalFormUrl = input?.message?.order?.xinput?.form?.url
    const additionalFormData = Object.entries(xinput?.data ?? {})?.map(([key, value]: any[]) => ({ formInputKey: key, formInputValue: value }));

    return { data: { context, company, initiatedJobs, jobFulfillments, additionalFormUrl, additionalFormData } };
}

export const buildConfirmRequest = (input: any = {}) => {
    const context = buildContext({
        category: "jobs",
        action: 'confirm',
        bppId: input?.context?.bppId,
        bppUri: input?.context?.bppUri,
        transactionId: input?.context?.transactionId,
    });
    const message: any = {
        order: {
            provider: { id: input?.companyId },
            items: [
                {
                    id: input?.jobId,
                    fulfillment_ids: [input?.confirmation?.JobFulfillmentCategoryId]
                }
            ],
            fulfillments: [{
                id: input?.confirmation?.JobFulfillmentCategoryId,
                customer: {
                    person: {
                        name: input?.confirmation?.jobApplicantProfile?.name,
                        languages: input?.confirmation?.jobApplicantProfile?.languages?.map((language: any) => ({ code: language })),
                        URL: input?.confirmation?.jobApplicantProfile?.url,
                        creds: input?.confirmation?.jobApplicantProfile?.creds.map((cred: any) => cred),
                        tags: [{ code: "func_skills", list: input?.confirmation?.jobApplicantProfile?.skills?.map((skill: any) => ({ name: skill })) }],
                    }
                }
            }]
        },

    }
    if (!input?.companyId) {
        delete message?.order?.provider
    }

    return { payload: { context, message } }
}

export const buildConfirmResponse = (input: any = {}, body: any = {}) => {
    return { data: input };
}

export const buildOnConfirmRequest = (input: any = {}) => {
    const context = buildContext({ category: 'jobs', action: 'on_confirm', transactionId: input?.transactionId, messageId: input?.messageId, bppId: input?.bppId, bppUri: input.bppUri });
    const message = {};

    return { payload: { context, message } };
}

export const buildOnConfirmResponse = (response: any = {}) => {
    const input = response?.data?.responses?.[0];
    if (!input)
        return { status: 200 };
    const { transaction_id: transactionId, message_id: messageId, bpp_id: bppId, bpp_uri: bppUri }: any = input?.context ?? {};
    const context = { transactionId, messageId, bppId, bppUri };

    const provider = input?.message?.order?.provider;
    const items = input?.message?.order?.items;
    const xinput = input?.message?.order?.xinput;
    const applicationId = input?.message?.order?.id;

    const company = {
        id: provider?.id,
        name: provider?.descriptor?.name,
        imageLink: provider?.descriptor?.images?.map((image: any) => ({ url: image?.url, size: image?.size_type }))
    }

    const confirmedJobs: any[] = [];
    items?.forEach((item: any) => {
        const job: any = {
            jobId: item?.id,
            role: item?.descriptor?.name,
            description: item?.descriptor?.long_desc,
            additionalDesc: { url: item?.descriptor?.additional_desc?.url, contentType: item?.descriptor?.additional_desc?.content_type },
            locations: provider?.locations
                ?.filter((location: any) => item?.location_ids?.find((locationId: any) => location.id == locationId))

                ?.map((location: any) => ({
                    id: location?.id,
                    city: location?.city?.name,
                    cityCode: location?.city?.code,
                    state: location?.state?.name,
                    country: location?.country?.name,
                    countryCode: location?.country?.code
                })),
            fulfillmentCategory: item?.fulfillments
                ?.filter((fulfillment: any) => item?.fulfillment_ids?.find((fulfillmentId: any) => fulfillment?.id == fulfillmentId))
                ?.map((fulfillment: any) => fulfillment),

            educationalQualifications: item?.tags
                ?.filter((tag: any) => tag?.descriptor?.name?.toLowerCase()?.includes('qualifications'))
                ?.map((tag: any) => ({
                    category: tag?.descriptor?.name,
                    qualification: tag?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
                }))
        };

        const responsibilities = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "responsibilities");

        const workExperience = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "work experience");
        const employmentInformation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "employment-info");
        const compensation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "salary-info");

        job.responsibilities = responsibilities?.list?.map((li: any) => li.value)

        job.workExperience = {
            key: workExperience?.descriptor?.name,
            experience: workExperience?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
        }
        job.employmentInformation = {
            code: employmentInformation?.descriptor?.code,
            name: employmentInformation?.descriptor?.name,
            employmentInfo: {
                code: employmentInformation?.list?.[0]?.descriptor?.code,
                name: employmentInformation?.list?.[0]?.descriptor?.name,
                value: employmentInformation?.list?.[0]?.value
            }
        }
        job.compensation = {
            code: compensation?.descriptor?.code,
            name: compensation?.descriptor?.name,
            salaryInfo: compensation?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value })),
        }

        confirmedJobs.push(job);
    });

    const jobFulfillments = input?.message?.order?.fulfillments.map((fulfilment: any) => ({
        jobFulfillmentCategoryId: fulfilment?.id,
        jobApplicantProfile: {
            name: fulfilment?.customer?.person?.name,
            language: fulfilment?.customer?.person?.languages?.map((language: any) => language?.code),
            profileUrl: fulfilment?.customer?.person?.url,
            creds: fulfilment?.customer?.person?.creds,
            skills: fulfilment?.customer?.person?.skills?.map((skill: any) => skill?.name)
        },
        state: fulfilment?.state?.descriptor

    }));

    const additionalFormData = Object.entries(xinput?.data ?? {})?.map(([key, value]: any[]) => ({ formInputKey: key, formInputValue: value }));

    return { data: { context, applicationId, company, confirmedJobs, jobFulfillments, additionalFormData } };
}

export const buildError = (input: any = {}) => {
    return {
        code: "404",
        message: input.message,
        data: input.data,
        type: "Application error",
        path: input.path
    }
}

export const buildStatusRequest = (input: any = {}) => {
    const context = buildContext({
        category: "jobs",
        action: 'status',
        bppId: input?.context?.bppId,
        bppUri: input?.context?.bppUri,
        transactionId: input?.context?.transactionId,
    });
    const message = {
        order_id: input?.applicationId
    }
    return { payload: { context, message } };
}
export const buildStatusResponse = (input: any = {}) => {
    return { data: input };
}
export const buildOnStatusRequest = (input: any = {}) => {
    const context = buildContext({ category: 'jobs', action: 'on_status', transactionId: input?.transactionId, messageId: input?.messageId, bppId: input?.bppId, bppUri: input.bppUri });
    const message = {};

    return { payload: { context, message } };
}
export const buildOnStatusResponse = (response: any = {}) => {
    const input = response?.data?.responses?.[0];
    if (!input)
        return { status: 200 };

    const { transaction_id: transactionId, message_id: messageId, bpp_id: bppId, bpp_uri: bppUri }: any = input?.context ?? {};
    const context = { transactionId, messageId, bppId, bppUri };

    const provider = input?.message?.order?.provider;
    const items = input?.message?.order?.items;
    const xinput = input?.message?.order?.xinput;
    const applicationId = input?.message?.order?.id;

    const company = {
        id: provider?.id,
        name: provider?.descriptor?.name,
        imageLink: provider?.descriptor?.images?.map((image: any) => ({ url: image?.url, size: image?.size_type }))
    }

    const confirmedJobs: any[] = [];
    items?.forEach((item: any) => {
        const job: any = {
            jobId: item?.id,
            role: item?.descriptor?.name,
            description: item?.descriptor?.long_desc,
            additionalDesc: { url: item?.descriptor?.additional_desc?.url, contentType: item?.descriptor?.additional_desc?.content_type },
            locations: provider?.locations
                ?.filter((location: any) => item?.location_ids?.find((locationId: any) => location.id == locationId))

                ?.map((location: any) => ({
                    id: location?.id,
                    city: location?.city?.name,
                    cityCode: location?.city?.code,
                    state: location?.state?.name,
                    country: location?.country?.name,
                    countryCode: location?.country?.code
                })),
            fulfillmentCategory: item?.fulfillments
                ?.filter((fulfillment: any) => item?.fulfillment_ids?.find((fulfillmentId: any) => fulfillment?.id == fulfillmentId))
                ?.map((fulfillment: any) => fulfillment),

            educationalQualifications: item?.tags
                ?.filter((tag: any) => tag?.descriptor?.name?.toLowerCase()?.includes('qualifications'))
                ?.map((tag: any) => ({
                    category: tag?.descriptor?.name,
                    qualification: tag?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
                }))
        };

        const responsibilities = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "responsibilities");

        const workExperience = item?.tags?.find((tag: any) => tag?.descriptor?.name?.toLowerCase() == "work experience");
        const employmentInformation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "employment-info");
        const compensation = item?.tags?.find((tag: any) => tag?.descriptor?.code == "salary-info");

        job.responsibilities = responsibilities?.list?.map((li: any) => li.value)

        job.workExperience = {
            key: workExperience?.descriptor?.name,
            experience: workExperience?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value }))
        }
        job.employmentInformation = {
            code: employmentInformation?.descriptor?.code,
            name: employmentInformation?.descriptor?.name,
            employmentInfo: {
                code: employmentInformation?.list?.[0]?.descriptor?.code,
                name: employmentInformation?.list?.[0]?.descriptor?.name,
                value: employmentInformation?.list?.[0]?.value
            }
        }
        job.compensation = {
            code: compensation?.descriptor?.code,
            name: compensation?.descriptor?.name,
            salaryInfo: compensation?.list?.map((li: any) => ({ code: li?.descriptor?.code, name: li?.descriptor?.name, value: li?.value })),
        }

        confirmedJobs.push(job);
    });

    const jobFulfillments = input?.message?.order?.fulfillments.map((fulfilment: any) => ({
        jobFulfillmentCategoryId: fulfilment?.id,
        jobApplicantProfile: {
            name: fulfilment?.customer?.person?.name,
            language: fulfilment?.customer?.person?.languages?.map((language: any) => language?.code),
            profileUrl: fulfilment?.customer?.person?.url,
            creds: fulfilment?.customer?.person?.creds,
            skills: fulfilment?.customer?.person?.skills?.map((skill: any) => skill?.name)
        },
        jobStatus: { status: fulfilment?.state?.descriptor?.name, statusCode: fulfilment?.state?.descriptor?.name }

    }));

    const additionalFormUrl = xinput?.form?.url
    const additionalFormData = Object.entries(xinput?.data ?? {})?.map(([key, value]: any[]) => ({ formInputKey: key, formInputValue: value }));

    return { data: { context, applicationId, company, confirmedJobs, jobFulfillments, additionalFormUrl, additionalFormData } };
}
