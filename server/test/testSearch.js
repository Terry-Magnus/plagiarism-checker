const axios = require("axios");

require("dotenv").config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const CX = process.env.GOOGLE_CSE_ID;

async function testSearch(query) {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: GOOGLE_API_KEY,
          cx: CX,
          q: query,
        },
      }
    );
    console.log(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

testSearch("Artificial intelligence is transforming the healthcare industry");
