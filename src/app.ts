import TelegramBot, { Message } from "node-telegram-bot-api";
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { searchTrainingService } from "./TrainingAndCourses/services";
import { searchJob } from "./JobsFlow/services";
import { getRedisKey, setRedisKey } from "./utils/redis.utils";

const language = [
  { value: "en", label: "english" },
  { value: "hi", label: "hindi" },
  {
    value: "ta",
    label: "tamil",
  },
  {
    value: "gu",
    label: "gujarati",
  },
  {
    value: "te",
    label: "telugu",
  },
  {
    value: "pa",
    label: "punjabi",
  },
];

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_ID as string;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

console.log("Telegram Bot Started");
// bot.onText(/\/course/, (msg) => {
//   console.log(msg);
//   bot.sendMessage(msg.chat.id, "/course Course Recieved");
// });

// bot.onText(/\/instructor/, async (msg) => {});

// bot.on("voice", (msg) => {
//   const chatId = msg.chat.id;
//   const voiceId = msg.voice.file_id;

//   bot.getFileLink(voiceId).then((link) => {
//     // handle the audio file link
//     console.log(link);
//     bot.sendMessage(chatId, "Thanks for the audio file!");
//   });
// });

const translateMessage = async (chatId: number, message: string) => {
  try {
    const model_api = process.env.BACKEND_MODE_API;
    const tragetLang = await getRedisKey(chatId.toString());
    const data = await axios.post(`${model_api}/translate`, {
      text: message,
      target_langs: tragetLang,
    });
    return data.data.translate_text;
  } catch (error) {
    console.log(error);
    return `Error, Could Not translate \n ${message}`;
  }
  return message;
};

bot.onText(/\/search/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const message = msg.text?.replace("/search ", "").replace("/search", "");
    bot.sendMessage(
      chatId,
      await translateMessage(
        chatId,
        `Searching data related to ${message} on open network.....`
      )
    );

    const data = await Promise.all([
      await searchJob({ title: { key: message } }),
      await searchTrainingService({ searchTitle: message }),
    ]);
    console.log(data);
    await sendJobData(chatId, data[0]);
    await sendCourseData(chatId, data[1]);

    bot.sendMessage(chatId, await translateMessage(chatId, `Results end`));
  } catch (error) {
    bot.sendMessage(
      chatId,
      await translateMessage(chatId, "An Error Occurred")
    );
  }
});

bot.onText(/\/course/, async (msg: Message) => {
  const chatId = msg.chat.id;
  try {
    const message = msg.text?.replace("/course ", "").replace("/course", "");
    console.log(message);
    let send_message = await translateMessage(
      chatId,
      `Searching courses related to ${message} on open network.....`
    );
    bot.sendMessage(chatId, send_message);

    const response = await Promise.all([
      searchTrainingService({ searchTitle: message }),
      searchTrainingService({ category: message }),
    ]);

    let data: any[] = [];
    if (response[0]?.data?.courses) {
      data = [...data, ...response[0]?.data?.courses];
    }

    if (response[1]?.data?.courses) {
      data = [...data, ...response[1]?.data?.courses];
    }
    console.log(response, data);

    await sendCourseData(chatId, { data: { courses: data } });
  } catch (error) {
    bot.sendMessage(
      chatId,
      await translateMessage(chatId, "An Error Occurred")
    );
  }
});

bot.onText(/\/job/, async (msg: Message) => {
  const chatId = msg.chat.id;

  try {
    const message = msg.text?.replace("/job ", "").replace("/job", "");
    bot.sendMessage(
      chatId,
      await translateMessage(
        chatId,
        `Searching jobs related to ${message} on open network.....`
      )
    );

    const response = await Promise.all([
      await searchJob({ title: { key: message } }),
      await searchJob({ company: { name: message } }),
      await searchJob({ locations: { name: { city: message } } }),
    ]);
    let data: any[] = [];
    if (response[0]?.data?.jobResults) {
      data = [...response[0].data.jobResults];
    }
    if (response[1]?.data?.jobResults) {
      data = [...data, ...response[1].data.jobResults];
    }
    if (response[2]?.data?.jobResults) {
      data = [...data, ...response[2].data.jobResults];
    }

    await sendJobData(chatId, { data: { jobResults: data } });
  } catch (error) {
    bot.sendMessage(chatId, await translateMessage(chatId, "A Error Occured"));
  }
});

bot.onText(/\/language/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const message = msg.text?.replace("/language ", "").replace("/language", "");
  const code = language.find(({ label }) => {
    return label === message?.toLowerCase();
  });
  setRedisKey(chatId.toString(), code?.label || "en");
});

const sendCourseData = async (chatId: any, response: any) => {
  if (response?.data?.courses?.length !== 0) {
    bot.sendMessage(chatId, await translateMessage(chatId, "Course Results"));
  } else {
    bot.sendMessage(
      chatId,
      await translateMessage(chatId, " No Course Results")
    );
  }
  for (const course of response?.data?.courses) {
    const image_url = course.imageLocations[0];
    const price = course.price.value;
    const currency = course.price.currency;
    const course_name = course.name;
    const course_url = course.course_url;
    const provider = course.provider.name;
    const category = course.category.name;
    let message = "";

    if (course_name) {
      message += `Course Name : ${course_name} \n`;
    }

    if (price) {
      message += `Course Price : `;
      if (price === "0") {
        message += "Free \n";
      } else {
        message += `${price} ${currency} \n`;
      }
    }

    if (provider) {
      message += `Provider : ${provider} \n`;
    }

    if (category) {
      message += `Category : ${category} \n`;
    }

    if (course_url) {
      message += `Course URL: ${course_url} \n`;
    }
    if (image_url) {
      bot.sendPhoto(chatId, image_url, {
        caption: await translateMessage(chatId, message),
      });
    } else {
      bot.sendMessage(chatId, await translateMessage(chatId, message));
    }
  }

  if (response?.data?.courses?.length !== 0) {
    bot.sendMessage(
      chatId,
      await translateMessage(chatId, "Course Results End")
    );
  }
};

const sendJobData = async (chatId: any, response: any) => {
  console.log(response);
  if (response?.data?.jobResults?.length !== 0) {
    bot.sendMessage(chatId, await translateMessage(chatId, "Job Results "));
  } else {
    bot.sendMessage(chatId, await translateMessage(chatId, " No Job found"));
  }
  const jobResults = response?.data?.jobResults;
  for (const jobs of jobResults) {
    for (const job of jobs?.jobs) {
      const { role, description, locations } = job;
      const { name, imageLink } = jobs.company;

      let message = `Company Name: ${name} \n`;
      message += `Role : ${role} \n`;
      message += `Description : ${description}\n`;
      if (locations.length !== 0) {
        locations.map((location: any) => {
          if (location.city) {
            message += `Location : ${location?.city}`;
          }
        });
      }
      if (job.additionalDesc) {
        const { url } = job.additionalDesc;
        if (url) {
          message += `Apply at: ${url}`;
        }
      }

      if (imageLink) {
        bot.sendPhoto(chatId, imageLink, {
          caption: await translateMessage(chatId, message),
        });
      } else {
        bot.sendMessage(chatId, await translateMessage(chatId, message));
      }
    }
  }

  if (response?.data?.jobResults?.length !== 0) {
    bot.sendMessage(chatId, await translateMessage(chatId, "Job Results End"));
  } else {
  }
};
