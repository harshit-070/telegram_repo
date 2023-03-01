import TelegramBot, { Message } from "node-telegram-bot-api";
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { searchTrainingService } from "./TrainingAndCourses/services";
import { searchJob } from "./JobsFlow/services";
import { getRedisKey, setRedisKey } from "./utils/redis.utils";
import https from "https";
import fs from "fs";
import path from "path";
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

const model_api = process.env.BACKEND_MODE_API;

const translateMessage = async (chatId: number, message: string) => {
  try {
    let targetLang = await getRedisKey(chatId.toString());
    if (!targetLang) {
      targetLang = "en";
    }
    const data = await axios.post(`${model_api}/translate`, {
      text: message,
      target_langs: targetLang,
    });
    return data.data.translate_text;
  } catch (error) {
    console.log(error);
    return `Error, Could Not translate \n ${message}`;
  }
  return message;
};

bot.on("message", async (msg: Message) => {
  console.log("Hello");
  console.log(msg);
  if (msg.document?.file_name?.includes(".mp4")) {
    console.log("Hi");
    const fileId = msg.document?.file_id;
    const chatId = msg.chat.id;
    // Download the video from Telegram
    let tragetLang = await getRedisKey(chatId.toString());
    if (!tragetLang) {
      tragetLang = "en";
    }
    console.log("hi");
    bot.getFileLink(fileId).then(async (fileLink) => {
      console.log(fileLink);
      const result = await axios.post(`${model_api}/video`, {
        chatId,
        url: fileLink,
        target_lang: tragetLang,
      });
      console.log(result);
    });
  }
  if (msg.audio) {
    console.log("Hi");
    const fileId = msg.audio.file_id;
    const chatId = msg.chat.id;
    let tragetLang = await getRedisKey(chatId.toString());
    if (!tragetLang) {
      tragetLang = "en";
    }
    bot.getFileLink(fileId).then(async (fileLink) => {
      const result = await axios.post(`${model_api}/audio_conversion`, {
        chatId,
        url: fileLink,
        target_lang: tragetLang,
      });
      console.log(result);
    });
  }
});

bot.onText(/\/start/, async (msg: Message) => {
  let message = "";
  const chatId = msg.chat.id;
  message += "/search {keyword} to the courses and job on open network \n";
  message += "/course {keyword} the courses on open network \n";
  message += "/job {keyword} the job on open network \n";
  message +=
    "/language {keyword} change the language of the search results including audio file\n";
  message += "/translate {text} convert text to the selected language\n";
  message += "/audio {text} convert audio file in the desired text\n";
  message += "/help to get the keyword \n";
  message += "/chat to get suggestion from chatGPT \n";
  message += `Note : Courses and jobs will be shown from dsep protocol \n`;
  bot.sendMessage(chatId, message);
});

bot.onText(/\/help/, async (msg: Message) => {
  let message = "";
  const chatId = msg.chat.id;
  message += "/search {keyword} to the courses and job on open network \n";
  message += "/course {keyword} the courses on open network \n";
  message += "/job {keyword} the job on open network \n";
  message +=
    "/language {keyword} change the language of the search results including audio file\n";
  message += "/audio {text} convert audio file in the desired text\n";
  message += "/translate {text} convert text to the selected language\n";
  message += "/help to get the keyword\n";
  message += "/chat to get suggestion from chatGPT \n";
  message += `Note : Courses and jobs will be shown from dsep protocol \n`;
  bot.sendMessage(chatId, await translateMessage(chatId, message));
});

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
  setRedisKey(chatId.toString(), code?.label || message?.toLowerCase());
});

bot.onText(/\/audio/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const message = msg.text?.replace("/audio ", "").replace("/audio", "");
  console.log(message);
  if (!message || message == "") {
    return bot.sendMessage(
      chatId,
      await translateMessage(chatId, "Please give message to translate")
    );
  }
  try {
    let tragetLang = await getRedisKey(chatId.toString());
    if (!tragetLang) {
      tragetLang = "en";
    }
    const output_path = path.join(
      __dirname,
      "./audio",
      `${chatId.toString()}.mp3`
    );
    bot.sendMessage(
      chatId,
      await translateMessage(chatId, "Please wait tranlation in progress")
    );
    console.log(message, tragetLang);
    axios
      .post(
        `${model_api}/audio`,
        {
          text: message,
          target_lang: tragetLang,
        },
        { responseType: "stream" }
      )
      .then((response) => {
        const audioFile = fs.createWriteStream(output_path);
        response.data.pipe(audioFile);
        audioFile.on("finish", () => {
          return bot.sendAudio(chatId, output_path);
        });
      })
      .catch((error) => {
        console.log("error :", error);
      });
    console.log("got response");
    // bot.sendAudio(chatId, output_path);
  } catch (error) {
    // console.log(error);
    return `Error, Could Not translate \n ${message}`;
  }
});

bot.onText(/\/chat/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const message = msg.text?.replace("/chat ", "").replace("/chat", "");

  try {
    const result = await axios.post(`${model_api}/chat`, { text: message });
    return bot.sendMessage(
      chatId,
      await translateMessage(chatId, result.data.answer)
    );
  } catch (error) {
    console.log(error);
    return bot.sendMessage(
      chatId,
      "Internal Error. Please try again after some time"
    );
  }
});

bot.onText(/\/translate/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const message = msg.text
    ?.replace("/translate ", "")
    .replace("/translate", "") as string;

  try {
    console.log("Hi");
    return bot.sendMessage(chatId, await translateMessage(chatId, message));
  } catch (error) {
    console.log(error);
    return bot.sendMessage(
      chatId,
      "Internal Error. Please try again after some time"
    );
  }
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
