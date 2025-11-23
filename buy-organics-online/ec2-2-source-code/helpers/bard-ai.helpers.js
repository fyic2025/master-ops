// require("bard-ai");
// import Bard from "bard-ai";
// const { BardAPI } = require("bard-api-node");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
const { default: axios } = require("axios");
const { getMySqlQuery } = require("../config/mysql");
// let bard = new Bard(
//   "eAhs-hPLuUYuwNi3Yp4eQLf-NbSIuulcLHjRZaectxcjKf6vep5ATH9wlgJHGMrMMOWm2w."
// );
exports.runBard = async (message = "say hello") => {
  console.log("AI - text generating...  ", message);

  const { data, headers } = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
    {
      contents: [
        {
          parts: [
            {
              text: message,
            },
          ],
        },
      ],
    }
  );
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text)
    return text;
  }
  return "";
  // let response;
  // try {
  //   console.log("Bard: init" );
  //   const assistant = new BardAPI();

  //   // Set session information for authentication
  //   await assistant.setSession("__Secure-1PSID", "eAhs-hPLuUYuwNi3Yp4eQLf-NbSIuulcLHjRZaectxcjKf6vep5ATH9wlgJHGMrMMOWm2w."); // or '__Secure-3PSID'
  //   // ...
  //   // await assistant.setSession("__Secure-3PSID", "eAhs-hPLuUYuwNi3Yp4eQLf-NbSIuulcLHjRZaectxcjKf6vt9Hpf2atcTr-ncMzreidJQ.");
  //   // Send a query to Bard
  //   response = await assistant.getBardResponse("Hello, how are you?");
  //   console.log("Bard:", response.content);
  // } catch (error) {
  //   console.error("Error:", error);
  // }

  // return response;

  //////////
  // const genAI = new GoogleGenerativeAI("AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE");
  // const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  // const prompt = "Write a story about a magic backpack."

  // const result = await model.generateContent(prompt);
  // const response = await result.response;
  // const text = response.text();
  // console.log(text);

  /////////

  // const { data, headers } = await axios.post(
  //   "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
  //   {
  //     prompt: { text: message },
  //   }
  // );
};

exports.runBardGetImpDescription = async (description = "", score = {}) => {
  console.log("AI - [runBardGetImpDescription] generating...  ");

  let query = getMySqlQuery();
  let results = await query(`SELECT * FROM settings where code=? and prop=?`, [
    "bardai",
    "ai_des_text",
  ]);
  let aitext = JSON.parse(results?.[0]?.value || "");
  aitext = aitext.replace("[[DESCRIPTION]]", description);

  aitext = aitext.replace(
    "[[factualityaccuracy]]",
    score?.factualityaccuracy || 0
  );
  aitext = aitext.replace(
    "[[evidencebasedclaims]]",
    score?.evidencebasedclaims || 0
  );
  aitext = aitext.replace(
    "[[transparencydisclosure]]",
    score?.transparencydisclosure || 0
  );
  aitext = aitext.replace(
    "[[clarityreadability]]",
    score?.clarityreadability || 0
  );
  aitext = aitext.replace("[[engagementtone]]", score?.engagementtone || 0);
  aitext = aitext.replace("[[structurelayout]]", score?.structurelayout || 0);
  aitext = aitext.replace("[[visualhierarchy]]", score?.visualhierarchy || 0);
  aitext = aitext.replace(
    "[[imagerymultimedia]]",
    score?.imagerymultimedia || 0
  );
  aitext = aitext.replace("[[accessibility]]", score?.accessibility || 0);
  aitext = aitext.replace(
    "[[overalleffectiveness]]",
    score?.overalleffectiveness || 0
  );
  aitext = aitext.replace(
    "[[alignmentwithtargetaudience]]",
    score?.alignmentwithtargetaudience || 0
  );
  aitext = aitext.replace("[[trustcredibility]]", score?.trustcredibility || 0);
  aitext = aitext.replace("[[completeness]]", score?.completeness || 0);
  aitext = aitext.replace(
    "[[searchfunctionality]]",
    score?.searchfunctionality || 0
  );
  aitext = aitext.replace("[[internallinking]]", score?.internallinking || 0);
  aitext = aitext.replace(
    "[[calltoactionclarity]]",
    score?.calltoactionclarity || 0
  );
  aitext = aitext.replace("[[disclaimer]]", score?.disclaimer || 0);
  // console.log(aitext);

  // return "";
  const result = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: aitext,
              },
              // {
              //   text: `Here is a product description. i want you to write improved description from different criteria in html format without head body tag. Rewrite the product description using UK spelling.`,
              // },

              // {
              //   text: `description:- ${description}`,
              // },
              // {
              //   text: `Here is a product description. i want you to write improved description from different criteria in html format without head body tag. Rewrite the product description using UK spelling.

              //   description:- ${description}

              //   You are an expert analyst, researcher and product description writer.  You are 45 year old female who is vegan, lives in Melbourne, Australia and has one 7 year old son.
              // Your goal is to research this project in full, analysing the existing product description, analyse the ratings that are in the database for Criteria for Assessment, which covers points A-P.  When you finally rewrite the product description at the end you will be striving to score 100/100 for all the criteria listed.
              // Criteria for Assessment:
              // A. Factuality & Accuracy: Consistent with reliable sources, avoiding exaggerations.
              // B. Evidence-Based Claims: Supported by research with references (low GI, high fibre).
              // C. Clarity & Readability: Clear, concise, and easy to understand.
              // D. Overall Effectiveness: Captures attention, highlights benefits, encourages purchase.
              // E. Trustworthiness & Credibility: Authoritative tone, trustworthy language, acknowledges limitations.
              // F. Completeness: Covers essential features and benefits.
              // G. Disclaimer: Discloses limitations or potential risks (allergies, full ingredients unavailable).
              // H. Target Audience: Health-conscious individuals, blood sugar management, busy people, families.
              // I. Structure & Layout: Headings, bullet points for clarity, instructions for HTML formatting.
              // J. Search Functionality: Relevant keywords and phrases for SEO.
              // K. Transparency & Disclosure: Honest and transparent information.
              // L. Visual Hierarchy: Clear visual structure (upon HTML formatting).
              // M. Internal Linking: Natural link to https://www.buyorganicsonline.com.au/.
              // N. . Call to Action: Clear and varied ways to encourage purchase.
              // O. Engagement Tone: Inviting and enthusiastic writing.
              // P. Accessibility: Content accessible for people with disabilities.
              // You will need to remember these scores and are ready to move onto comprehensively checking these next 22 points listed below.
              // 1. Make an educated guess about the target audience of this product based on analysis of the product description and / or product title if no description exists. remember this audience when ready to update the product description.
              // 2. when ready to write after all steps completed and checked use headings (H2, H3, H4, etc.) for structure and SEO.
              // 3. when ready to write after all steps completed and checked Bold headings for emphasis and space the content as required.
              // 4. when ready to write after all steps completed and checked retain any existing internal links from existing content in the revised description
              // 5. Conduct any required research using available resources (e.g., internet search engines) within a maximum of 10 minutes, prioritising any known reputable sources to validate any existing or potentially new health claims.
              // 5.1 Always include a suitable disclaimer for each description that is commensuate to the level of risk
              // 6. Include references correctly being numbered next to the claim for any health, nutritional, or medical claims and include as references at the end of the description in the correct format.
              // 7. Omit the "References" section if no references are needed.
              // 8. Always retain any ingredients list if available in original description into the new description.
              // 9. Exclude the "Ingredients" heading if the list is not available.
              // 10. Include a clear call to action that encourages purchase, using varied language.
              // 11. identify any features and benefits of the product
              // 12. when the time comes you will be writing in an authoritative and informative tone who is an expert.
              // 13. you will always use UK spelling.
              // 14. Avoid overt references to the UK or UK-specific terms.
              // 15. The description will be for an Australian audience but we dont use Aussie slang or story telling.
              // 16. Never guess ingredients.
              // 17. Everything written must be factual and backed by medical research when making claims.
              // 18. Add a Q&A section when possible.
              // 19. Ensure user-friendly formatting with headings bolded
              // 20. Triple-check all content before submission
              // 21. write the description
              // 22. check that the description is only using uk english.
              // Task is completed`,
              // },
              // {
              //   text: `Criteria is -

              //   Factuality & Accuracy: This encompasses verifying claims, descriptions, and ingredient information against reliable sources like scientific databases, industry standards, and regulatory guidelines.

              //   Evidence-based claims: Do claims about product benefits have scientific backing or anecdotal evidence? Are they differentiated from mere speculation or subjective opinions?

              //   Transparency & Disclosure: Are potential risks and side effects mentioned? Are certifications and ingredient lists readily available? Does the description avoid manipulative tactics or hidden information?

              //   Clarity & Readability: Is the language easily understood by your target audience? Are sentences concise and grammatically correct? Is the information organised logically and scannable?

              //   Engagement & Tone: Does the description capture attention and interest? Does it resonate with your brand voice and target audience preferences? Is the tone consistent throughout the description?

              //   Structure & Layout: Is the information presented in a logical and user-friendly manner? Are critical features, benefits, and calls to action prominently displayed?

              //   Visual Hierarchy: Are headings, bullet points, and bold formatting used effectively to prioritise information and improve scannability?

              //   Imagery & Multimedia: Are high-quality, relevant images and videos used to complement the text and enhance understanding?

              //   Accessibility: Is the description accessible for disabled users, such as visual impairments or screen readers?

              //   Overall Effectiveness: Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              //   Alignment with Target Audience: Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              //   Trust & Credibility: Does the description foster trust and build confidence in your brand and products? Does it avoid exaggerated claims or misleading information?

              //   Completeness: Does the description provide all the information users need to make an informed decision about the product? Are there any crucial details missing?

              //   Search Functionality: Does the description integrate keywords and metadata effectively to ensure the product is easily discoverable within your website and through search engines?

              //   Internal linking: Are relevant links to complementary products, blog posts, or other resources included for user exploration and deeper engagement?

              //   Call to action clarity: Are calls to action (e.g., 'Buy Now', 'Learn More') clear, concise, and strategically placed to encourage desired user behaviour?

              //   Disclaimer: Does the product use a disclaimer and if so how comprehensive and relevant is it?`,
              // },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[runBardGetImpDescription] --API---ERROR---- --", err);
    });
  if (!result) {
    return "";
  }
  let { data, headers } = result;
  if (!data) {
    return "";
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text)
    return text;
  }
  return "";
};

exports.runBardGetDescriptionScore = async (description = "") => {
  // console.log("AI - text generating...  ", message);

  const { data, headers } = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `here is a product discription. i want you to evaluate the content from different criteria. i will post the content and ask you to assess out of 100`,
              },
              {
                text: description,
              },
              {
                text: `Factuality & Accuracy: only provide one score out of 100
              This encompasses verifying claims, descriptions, and ingredient information against reliable sources like scientific databases, industry standards, and regulatory guidelines.
              
              Evidence-based claims: only provide one score out of 100
              Do claims about product benefits have scientific backing or anecdotal evidence? Are they differentiated from mere speculation or subjective opinions?
              
              Transparency & Disclosure: only provide one score out of 100
              Are potential risks and side effects mentioned? Are certifications and ingredient lists readily available? Does the description avoid manipulative tactics or hidden information?
              
              Clarity & Readability: only provide one score out of 100
              Is the language easily understood by your target audience? Are sentences concise and grammatically correct? Is the information organised logically and scannable?
              
              Engagement & Tone: only provide one score out of 100
              Does the description capture attention and interest? Does it resonate with your brand voice and target audience preferences? Is the tone consistent throughout the description?
              
              
              Structure & Layout: only provide one score out of 100
              Is the information presented in a logical and user-friendly manner? Are critical features, benefits, and calls to action prominently displayed?
              
              Visual Hierarchy: only provide one score out of 100
              Are headings, bullet points, and bold formatting used effectively to prioritise information and improve scannability?
              
              Imagery & Multimedia: only provide one score out of 100
              Are high-quality, relevant images and videos used to complement the text and enhance understanding?
              
              Accessibility: only provide one score out of 100
              Is the description accessible for disabled users, such as visual impairments or screen readers?
              
              Overall Effectiveness: Only provide one score out of 100.
              Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              Alignment with Target Audience: Only provide one score out of 100.
              Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?
              
              Trust & Credibility: only provide one score out of 100
              Does the description foster trust and build confidence in your brand and products? Does it avoid exaggerated claims or misleading information?
              
              Completeness: only provide one score out of 100
              Does the description provide all the information users need to make an informed decision about the product? Are there any crucial details missing?
              
              Search Functionality: only provide one score out of 100  
              Does the description integrate keywords and metadata effectively to ensure the product is easily discoverable within your website and through search engines?
              
              Internal linking: only provide one score out of 100
              Are relevant links to complementary products, blog posts, or other resources included for user exploration and deeper engagement?
              
              Call to action clarity: only provide one score out of 100
              Are calls to action (e.g., "Buy Now," "Learn More") clear, concise, and strategically placed to encourage desired user behaviour?
              
              Disclaimer: only provide one score out of 100 
              Does the product use a disclaimer and if so how comprehensive and relevant is it?
              `,
              },
              // {
              //   text: "Factuality & Accuracy: only provide one score out of 100",
              // },
              // {
              //   text: "Evidence-based claims: only provide one score out of 100",
              // },

              // {
              //   text: "Transparency & Disclosure: only provide one score out of 100",
              // },
              // {
              //   text: "Clarity & Readability: only provide one score out of 100",
              // },
              // {
              //   text: "Engagement & Tone: only provide one score out of 100",
              // },
              // {
              //   text: "Structure & Layout: only provide one score out of 100",
              // },
              // {
              //   text: "Visual Hierarchy: only provide one score out of 100",
              // },
              // {
              //   text: "Imagery & Multimedia: only provide one score out of 100",
              // },
              // {
              //   text: "Accessibility: only provide one score out of 100",
              // },
              // {
              //   text: "Overall Effectiveness: Only provide one score out of 100.",
              // },
              // {
              //   text: "Alignment with Target Audience: Only provide one score out of 100.",
              // },
              // {
              //   text: "Trust & Credibility: only provide one score out of 100",
              // },
              // {
              //   text: "Completeness: only provide one score out of 100",
              // },
              // {
              //   text: "Search Functionality: only provide one score out of 100",
              // },
              // {
              //   text: "Internal linking: only provide one score out of 100",
              // },
              // {
              //   text: "Call to action clarity: only provide one score out of 100",
              // },
              // {
              //   text: "Disclaimer: only provide one score out of 100",
              // },
              {
                text: "get score value from above content and remove remaining content",
              },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[fetchScoreBCProducts] --API---ERROR---- --", err);
    });
  if (!data) {
    return;
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text);
    return text;
  }
  return "";
};

function getScoreJSON(text = "") {
  text = text.replace(/ out of /g, "/");
  text = text.replace(/<b>|<\/b>/g, "");
  text = text.replace(/\*/g, "");
  text = text.replace(/ \| /g, ": ");
  text = text.replace(/ \|/g, "/100");
  // console.log("rr- text", text);
  let pattern = /[a-zA-Z0-9- &]+: \d{1,3}\/\d{3}/g;
  let result = text.match(pattern);
  let noSlash = false;
  if (!result) {
    result = text.match(/[a-zA-Z0-9- &]+: \d{1,3}/g);
    noSlash = true;
  }
  // console.log("rr- result", result);
  if (result) {
    let data = result
      .map((r) => {
        let pat = noSlash ? /\d{1,3}/g : /\d{1,3}\//g;
        let no = r.match(pat).join("");

        let text = r
          .match(/[a-zA-Z0-9- &]+:/g)
          .join("")
          .trim()
          .replace(":", "");
        let key = text.replace(/ |&|-/g, "").toLocaleLowerCase();
        return {
          key,
          text,
          no: parseFloat(no),
        };
      })
      .reduce((s, r) => {
        return { ...s, [r.key]: { text: r.text, no: r.no } };
      }, {});
    // console.log("rr- ",  data);
    return data;
  }
  return {};
  // console.log('rr- NULL',result)
}

exports.getScoreJSON = getScoreJSON;

exports.runBardGetCatImpDescription = async (description = "", score = {}) => {
  console.log("AI - [runBardGetCatImpDescription] generating...  ");

  let query = getMySqlQuery();
  let results = await query(`SELECT * FROM settings where code=? and prop=?`, [
    "bardai",
    "ai_cat_text",
  ]);
  let aitext = JSON.parse(results?.[0]?.value || "");
  aitext = aitext.replace("[[DESCRIPTION]]", description);
  aitext = aitext.replace(
    "[[factualityaccuracy]]",
    score?.factualityaccuracy || 0
  );
  aitext = aitext.replace(
    "[[evidencebasedclaims]]",
    score?.evidencebasedclaims || 0
  );
  aitext = aitext.replace(
    "[[transparencydisclosure]]",
    score?.transparencydisclosure || 0
  );
  aitext = aitext.replace(
    "[[clarityreadability]]",
    score?.clarityreadability || 0
  );
  aitext = aitext.replace("[[engagementtone]]", score?.engagementtone || 0);
  aitext = aitext.replace("[[structurelayout]]", score?.structurelayout || 0);
  aitext = aitext.replace("[[visualhierarchy]]", score?.visualhierarchy || 0);
  aitext = aitext.replace(
    "[[imagerymultimedia]]",
    score?.imagerymultimedia || 0
  );
  aitext = aitext.replace("[[accessibility]]", score?.accessibility || 0);
  aitext = aitext.replace(
    "[[overalleffectiveness]]",
    score?.overalleffectiveness || 0
  );
  aitext = aitext.replace(
    "[[alignmentwithtargetaudience]]",
    score?.alignmentwithtargetaudience || 0
  );
  aitext = aitext.replace("[[trustcredibility]]", score?.trustcredibility || 0);
  aitext = aitext.replace("[[completeness]]", score?.completeness || 0);
  aitext = aitext.replace(
    "[[searchfunctionality]]",
    score?.searchfunctionality || 0
  );
  aitext = aitext.replace("[[internallinking]]", score?.internallinking || 0);
  aitext = aitext.replace(
    "[[calltoactionclarity]]",
    score?.calltoactionclarity || 0
  );
  aitext = aitext.replace("[[disclaimer]]", score?.disclaimer || 0);
  // console.log(aitext);

  // return "";
  const result = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: aitext,
              },
              // {
              //   text: `Here is a product description. i want you to write improved description from different criteria in html format without head body tag. Rewrite the product description using UK spelling.`,
              // },

              // {
              //   text: `description:- ${description}`,
              // },
              // {
              //   text: `Here is a product description. i want you to write improved description from different criteria in html format without head body tag. Rewrite the product description using UK spelling.

              //   description:- ${description}

              //   You are an expert analyst, researcher and product description writer.  You are 45 year old female who is vegan, lives in Melbourne, Australia and has one 7 year old son.
              // Your goal is to research this project in full, analysing the existing product description, analyse the ratings that are in the database for Criteria for Assessment, which covers points A-P.  When you finally rewrite the product description at the end you will be striving to score 100/100 for all the criteria listed.
              // Criteria for Assessment:
              // A. Factuality & Accuracy: Consistent with reliable sources, avoiding exaggerations.
              // B. Evidence-Based Claims: Supported by research with references (low GI, high fibre).
              // C. Clarity & Readability: Clear, concise, and easy to understand.
              // D. Overall Effectiveness: Captures attention, highlights benefits, encourages purchase.
              // E. Trustworthiness & Credibility: Authoritative tone, trustworthy language, acknowledges limitations.
              // F. Completeness: Covers essential features and benefits.
              // G. Disclaimer: Discloses limitations or potential risks (allergies, full ingredients unavailable).
              // H. Target Audience: Health-conscious individuals, blood sugar management, busy people, families.
              // I. Structure & Layout: Headings, bullet points for clarity, instructions for HTML formatting.
              // J. Search Functionality: Relevant keywords and phrases for SEO.
              // K. Transparency & Disclosure: Honest and transparent information.
              // L. Visual Hierarchy: Clear visual structure (upon HTML formatting).
              // M. Internal Linking: Natural link to https://www.buyorganicsonline.com.au/.
              // N. . Call to Action: Clear and varied ways to encourage purchase.
              // O. Engagement Tone: Inviting and enthusiastic writing.
              // P. Accessibility: Content accessible for people with disabilities.
              // You will need to remember these scores and are ready to move onto comprehensively checking these next 22 points listed below.
              // 1. Make an educated guess about the target audience of this product based on analysis of the product description and / or product title if no description exists. remember this audience when ready to update the product description.
              // 2. when ready to write after all steps completed and checked use headings (H2, H3, H4, etc.) for structure and SEO.
              // 3. when ready to write after all steps completed and checked Bold headings for emphasis and space the content as required.
              // 4. when ready to write after all steps completed and checked retain any existing internal links from existing content in the revised description
              // 5. Conduct any required research using available resources (e.g., internet search engines) within a maximum of 10 minutes, prioritising any known reputable sources to validate any existing or potentially new health claims.
              // 5.1 Always include a suitable disclaimer for each description that is commensuate to the level of risk
              // 6. Include references correctly being numbered next to the claim for any health, nutritional, or medical claims and include as references at the end of the description in the correct format.
              // 7. Omit the "References" section if no references are needed.
              // 8. Always retain any ingredients list if available in original description into the new description.
              // 9. Exclude the "Ingredients" heading if the list is not available.
              // 10. Include a clear call to action that encourages purchase, using varied language.
              // 11. identify any features and benefits of the product
              // 12. when the time comes you will be writing in an authoritative and informative tone who is an expert.
              // 13. you will always use UK spelling.
              // 14. Avoid overt references to the UK or UK-specific terms.
              // 15. The description will be for an Australian audience but we dont use Aussie slang or story telling.
              // 16. Never guess ingredients.
              // 17. Everything written must be factual and backed by medical research when making claims.
              // 18. Add a Q&A section when possible.
              // 19. Ensure user-friendly formatting with headings bolded
              // 20. Triple-check all content before submission
              // 21. write the description
              // 22. check that the description is only using uk english.
              // Task is completed`,
              // },
              // {
              //   text: `Criteria is -

              //   Factuality & Accuracy: This encompasses verifying claims, descriptions, and ingredient information against reliable sources like scientific databases, industry standards, and regulatory guidelines.

              //   Evidence-based claims: Do claims about product benefits have scientific backing or anecdotal evidence? Are they differentiated from mere speculation or subjective opinions?

              //   Transparency & Disclosure: Are potential risks and side effects mentioned? Are certifications and ingredient lists readily available? Does the description avoid manipulative tactics or hidden information?

              //   Clarity & Readability: Is the language easily understood by your target audience? Are sentences concise and grammatically correct? Is the information organised logically and scannable?

              //   Engagement & Tone: Does the description capture attention and interest? Does it resonate with your brand voice and target audience preferences? Is the tone consistent throughout the description?

              //   Structure & Layout: Is the information presented in a logical and user-friendly manner? Are critical features, benefits, and calls to action prominently displayed?

              //   Visual Hierarchy: Are headings, bullet points, and bold formatting used effectively to prioritise information and improve scannability?

              //   Imagery & Multimedia: Are high-quality, relevant images and videos used to complement the text and enhance understanding?

              //   Accessibility: Is the description accessible for disabled users, such as visual impairments or screen readers?

              //   Overall Effectiveness: Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              //   Alignment with Target Audience: Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              //   Trust & Credibility: Does the description foster trust and build confidence in your brand and products? Does it avoid exaggerated claims or misleading information?

              //   Completeness: Does the description provide all the information users need to make an informed decision about the product? Are there any crucial details missing?

              //   Search Functionality: Does the description integrate keywords and metadata effectively to ensure the product is easily discoverable within your website and through search engines?

              //   Internal linking: Are relevant links to complementary products, blog posts, or other resources included for user exploration and deeper engagement?

              //   Call to action clarity: Are calls to action (e.g., 'Buy Now', 'Learn More') clear, concise, and strategically placed to encourage desired user behaviour?

              //   Disclaimer: Does the product use a disclaimer and if so how comprehensive and relevant is it?`,
              // },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[runBardGetCatImpDescription] --API---ERROR---- --", err);
    });
  if (!result) {
    return "";
  }
  let { data, headers } = result;
  if (!data) {
    return "";
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text)
    return text;
  }
  return "";
};
exports.runBardGetCatScore = async (description = "") => {
  // console.log("AI - text generating...  ", message);

  const r = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `here is a product category description. i want you to evaluate the content from different criteria. i will post the content and ask you to assess out of 100`,
              },
              {
                text: description,
              },
              {
                text: `Factuality & Accuracy: only provide one score out of 100
              This encompasses verifying claims, descriptions, and ingredient information against reliable sources like scientific databases, industry standards, and regulatory guidelines.
              
              Evidence-based claims: only provide one score out of 100
              Do claims about product benefits have scientific backing or anecdotal evidence? Are they differentiated from mere speculation or subjective opinions?
              
              Transparency & Disclosure: only provide one score out of 100
              Are potential risks and side effects mentioned? Are certifications and ingredient lists readily available? Does the description avoid manipulative tactics or hidden information?
              
              Clarity & Readability: only provide one score out of 100
              Is the language easily understood by your target audience? Are sentences concise and grammatically correct? Is the information organised logically and scannable?
              
              Engagement & Tone: only provide one score out of 100
              Does the description capture attention and interest? Does it resonate with your brand voice and target audience preferences? Is the tone consistent throughout the description?
              
              
              Structure & Layout: only provide one score out of 100
              Is the information presented in a logical and user-friendly manner? Are critical features, benefits, and calls to action prominently displayed?
              
              Visual Hierarchy: only provide one score out of 100
              Are headings, bullet points, and bold formatting used effectively to prioritise information and improve scannability?
              
              Imagery & Multimedia: only provide one score out of 100
              Are high-quality, relevant images and videos used to complement the text and enhance understanding?
              
              Accessibility: only provide one score out of 100
              Is the description accessible for disabled users, such as visual impairments or screen readers?
              
              Overall Effectiveness: Only provide one score out of 100.
              Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              Alignment with Target Audience: Only provide one score out of 100.
              Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?
              
              Trust & Credibility: only provide one score out of 100
              Does the description foster trust and build confidence in your brand and products? Does it avoid exaggerated claims or misleading information?
              
              Completeness: only provide one score out of 100
              Does the description provide all the information users need to make an informed decision about the product? Are there any crucial details missing?
              
              Search Functionality: only provide one score out of 100  
              Does the description integrate keywords and metadata effectively to ensure the product is easily discoverable within your website and through search engines?
              
              Internal linking: only provide one score out of 100
              Are relevant links to complementary products, blog posts, or other resources included for user exploration and deeper engagement?
              
              Call to action clarity: only provide one score out of 100
              Are calls to action (e.g., "Buy Now," "Learn More") clear, concise, and strategically placed to encourage desired user behaviour?
              
              Disclaimer: only provide one score out of 100 
              Does the product use a disclaimer and if so how comprehensive and relevant is it?
              `,
              },
              // {
              //   text: "Factuality & Accuracy: only provide one score out of 100",
              // },
              // {
              //   text: "Evidence-based claims: only provide one score out of 100",
              // },

              // {
              //   text: "Transparency & Disclosure: only provide one score out of 100",
              // },
              // {
              //   text: "Clarity & Readability: only provide one score out of 100",
              // },
              // {
              //   text: "Engagement & Tone: only provide one score out of 100",
              // },
              // {
              //   text: "Structure & Layout: only provide one score out of 100",
              // },
              // {
              //   text: "Visual Hierarchy: only provide one score out of 100",
              // },
              // {
              //   text: "Imagery & Multimedia: only provide one score out of 100",
              // },
              // {
              //   text: "Accessibility: only provide one score out of 100",
              // },
              // {
              //   text: "Overall Effectiveness: Only provide one score out of 100.",
              // },
              // {
              //   text: "Alignment with Target Audience: Only provide one score out of 100.",
              // },
              // {
              //   text: "Trust & Credibility: only provide one score out of 100",
              // },
              // {
              //   text: "Completeness: only provide one score out of 100",
              // },
              // {
              //   text: "Search Functionality: only provide one score out of 100",
              // },
              // {
              //   text: "Internal linking: only provide one score out of 100",
              // },
              // {
              //   text: "Call to action clarity: only provide one score out of 100",
              // },
              // {
              //   text: "Disclaimer: only provide one score out of 100",
              // },
              {
                text: "get score value from above content and remove remaining content",
              },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[fetchScoreBCProducts] --API---ERROR---- --", err);
    });
  if (!r) {
    return "";
  }
  let { data, headers } = r;
  if (!data) {
    return "";
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text);
    return text;
  }
  return "";
};

////

exports.runBardGetBlogImpDescription = async (description = "", score = {}) => {
  console.log("AI - [runBardGetBlogImpDescription] generating...  ");

  let query = getMySqlQuery();
  let results = await query(`SELECT * FROM settings where code=? and prop=?`, [
    "bardai",
    "ai_blog_text",
  ]);
  let aitext = JSON.parse(results?.[0]?.value || "");
  aitext = aitext.replace("[[DESCRIPTION]]", description);
  aitext = aitext.replace(
    "[[factualityaccuracy]]",
    score?.factualityaccuracy || 0
  );
  aitext = aitext.replace(
    "[[evidencebasedclaims]]",
    score?.evidencebasedclaims || 0
  );
  aitext = aitext.replace(
    "[[transparencydisclosure]]",
    score?.transparencydisclosure || 0
  );
  aitext = aitext.replace(
    "[[clarityreadability]]",
    score?.clarityreadability || 0
  );
  aitext = aitext.replace("[[engagementtone]]", score?.engagementtone || 0);
  aitext = aitext.replace("[[structurelayout]]", score?.structurelayout || 0);
  aitext = aitext.replace("[[visualhierarchy]]", score?.visualhierarchy || 0);
  aitext = aitext.replace(
    "[[imagerymultimedia]]",
    score?.imagerymultimedia || 0
  );
  aitext = aitext.replace("[[accessibility]]", score?.accessibility || 0);
  aitext = aitext.replace(
    "[[overalleffectiveness]]",
    score?.overalleffectiveness || 0
  );
  aitext = aitext.replace(
    "[[alignmentwithtargetaudience]]",
    score?.alignmentwithtargetaudience || 0
  );
  aitext = aitext.replace("[[trustcredibility]]", score?.trustcredibility || 0);
  aitext = aitext.replace("[[completeness]]", score?.completeness || 0);
  aitext = aitext.replace(
    "[[searchfunctionality]]",
    score?.searchfunctionality || 0
  );
  aitext = aitext.replace("[[internallinking]]", score?.internallinking || 0);
  aitext = aitext.replace(
    "[[calltoactionclarity]]",
    score?.calltoactionclarity || 0
  );
  aitext = aitext.replace("[[disclaimer]]", score?.disclaimer || 0);
  // console.log(aitext);

  // return "";
  const result = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: aitext,
              },
              // {
              //   text: `Here is a product description. i want you to write improved description from different criteria in html format without head body tag. Rewrite the product description using UK spelling.`,
              // },

              // {
              //   text: `description:- ${description}`,
              // },
              // {
              //   text: `Here is a product description. i want you to write improved description from different criteria in html format without head body tag. Rewrite the product description using UK spelling.

              //   description:- ${description}

              //   You are an expert analyst, researcher and product description writer.  You are 45 year old female who is vegan, lives in Melbourne, Australia and has one 7 year old son.
              // Your goal is to research this project in full, analysing the existing product description, analyse the ratings that are in the database for Criteria for Assessment, which covers points A-P.  When you finally rewrite the product description at the end you will be striving to score 100/100 for all the criteria listed.
              // Criteria for Assessment:
              // A. Factuality & Accuracy: Consistent with reliable sources, avoiding exaggerations.
              // B. Evidence-Based Claims: Supported by research with references (low GI, high fibre).
              // C. Clarity & Readability: Clear, concise, and easy to understand.
              // D. Overall Effectiveness: Captures attention, highlights benefits, encourages purchase.
              // E. Trustworthiness & Credibility: Authoritative tone, trustworthy language, acknowledges limitations.
              // F. Completeness: Covers essential features and benefits.
              // G. Disclaimer: Discloses limitations or potential risks (allergies, full ingredients unavailable).
              // H. Target Audience: Health-conscious individuals, blood sugar management, busy people, families.
              // I. Structure & Layout: Headings, bullet points for clarity, instructions for HTML formatting.
              // J. Search Functionality: Relevant keywords and phrases for SEO.
              // K. Transparency & Disclosure: Honest and transparent information.
              // L. Visual Hierarchy: Clear visual structure (upon HTML formatting).
              // M. Internal Linking: Natural link to https://www.buyorganicsonline.com.au/.
              // N. . Call to Action: Clear and varied ways to encourage purchase.
              // O. Engagement Tone: Inviting and enthusiastic writing.
              // P. Accessibility: Content accessible for people with disabilities.
              // You will need to remember these scores and are ready to move onto comprehensively checking these next 22 points listed below.
              // 1. Make an educated guess about the target audience of this product based on analysis of the product description and / or product title if no description exists. remember this audience when ready to update the product description.
              // 2. when ready to write after all steps completed and checked use headings (H2, H3, H4, etc.) for structure and SEO.
              // 3. when ready to write after all steps completed and checked Bold headings for emphasis and space the content as required.
              // 4. when ready to write after all steps completed and checked retain any existing internal links from existing content in the revised description
              // 5. Conduct any required research using available resources (e.g., internet search engines) within a maximum of 10 minutes, prioritising any known reputable sources to validate any existing or potentially new health claims.
              // 5.1 Always include a suitable disclaimer for each description that is commensuate to the level of risk
              // 6. Include references correctly being numbered next to the claim for any health, nutritional, or medical claims and include as references at the end of the description in the correct format.
              // 7. Omit the "References" section if no references are needed.
              // 8. Always retain any ingredients list if available in original description into the new description.
              // 9. Exclude the "Ingredients" heading if the list is not available.
              // 10. Include a clear call to action that encourages purchase, using varied language.
              // 11. identify any features and benefits of the product
              // 12. when the time comes you will be writing in an authoritative and informative tone who is an expert.
              // 13. you will always use UK spelling.
              // 14. Avoid overt references to the UK or UK-specific terms.
              // 15. The description will be for an Australian audience but we dont use Aussie slang or story telling.
              // 16. Never guess ingredients.
              // 17. Everything written must be factual and backed by medical research when making claims.
              // 18. Add a Q&A section when possible.
              // 19. Ensure user-friendly formatting with headings bolded
              // 20. Triple-check all content before submission
              // 21. write the description
              // 22. check that the description is only using uk english.
              // Task is completed`,
              // },
              // {
              //   text: `Criteria is -

              //   Factuality & Accuracy: This encompasses verifying claims, descriptions, and ingredient information against reliable sources like scientific databases, industry standards, and regulatory guidelines.

              //   Evidence-based claims: Do claims about product benefits have scientific backing or anecdotal evidence? Are they differentiated from mere speculation or subjective opinions?

              //   Transparency & Disclosure: Are potential risks and side effects mentioned? Are certifications and ingredient lists readily available? Does the description avoid manipulative tactics or hidden information?

              //   Clarity & Readability: Is the language easily understood by your target audience? Are sentences concise and grammatically correct? Is the information organised logically and scannable?

              //   Engagement & Tone: Does the description capture attention and interest? Does it resonate with your brand voice and target audience preferences? Is the tone consistent throughout the description?

              //   Structure & Layout: Is the information presented in a logical and user-friendly manner? Are critical features, benefits, and calls to action prominently displayed?

              //   Visual Hierarchy: Are headings, bullet points, and bold formatting used effectively to prioritise information and improve scannability?

              //   Imagery & Multimedia: Are high-quality, relevant images and videos used to complement the text and enhance understanding?

              //   Accessibility: Is the description accessible for disabled users, such as visual impairments or screen readers?

              //   Overall Effectiveness: Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              //   Alignment with Target Audience: Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              //   Trust & Credibility: Does the description foster trust and build confidence in your brand and products? Does it avoid exaggerated claims or misleading information?

              //   Completeness: Does the description provide all the information users need to make an informed decision about the product? Are there any crucial details missing?

              //   Search Functionality: Does the description integrate keywords and metadata effectively to ensure the product is easily discoverable within your website and through search engines?

              //   Internal linking: Are relevant links to complementary products, blog posts, or other resources included for user exploration and deeper engagement?

              //   Call to action clarity: Are calls to action (e.g., 'Buy Now', 'Learn More') clear, concise, and strategically placed to encourage desired user behaviour?

              //   Disclaimer: Does the product use a disclaimer and if so how comprehensive and relevant is it?`,
              // },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[runBardGetBlogImpDescription] --API---ERROR---- --", err);
    });
  if (!result) {
    return "";
  }
  let { data, headers } = result;
  if (!data) {
    return "";
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text)
    return text;
  }
  return "";
};

exports.runBardGetBlogScore = async (description = "") => {
  // console.log("AI - text generating...  ", message);

  const r = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `here is a blog description. i want you to evaluate the content from different criteria. i will post the content and ask you to assess out of 100`,
              },
              {
                text: description,
              },
              {
                text: `Factuality & Accuracy: only provide one score out of 100
              This encompasses verifying claims, descriptions, and ingredient information against reliable sources like scientific databases, industry standards, and regulatory guidelines.
              
              Evidence-based claims: only provide one score out of 100
              Do claims about product benefits have scientific backing or anecdotal evidence? Are they differentiated from mere speculation or subjective opinions?
              
              Transparency & Disclosure: only provide one score out of 100
              Are potential risks and side effects mentioned? Are certifications and ingredient lists readily available? Does the description avoid manipulative tactics or hidden information?
              
              Clarity & Readability: only provide one score out of 100
              Is the language easily understood by your target audience? Are sentences concise and grammatically correct? Is the information organised logically and scannable?
              
              Engagement & Tone: only provide one score out of 100
              Does the description capture attention and interest? Does it resonate with your brand voice and target audience preferences? Is the tone consistent throughout the description?
              
              
              Structure & Layout: only provide one score out of 100
              Is the information presented in a logical and user-friendly manner? Are critical features, benefits, and calls to action prominently displayed?
              
              Visual Hierarchy: only provide one score out of 100
              Are headings, bullet points, and bold formatting used effectively to prioritise information and improve scannability?
              
              Imagery & Multimedia: only provide one score out of 100
              Are high-quality, relevant images and videos used to complement the text and enhance understanding?
              
              Accessibility: only provide one score out of 100
              Is the description accessible for disabled users, such as visual impairments or screen readers?
              
              Overall Effectiveness: Only provide one score out of 100.
              Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?

              Alignment with Target Audience: Only provide one score out of 100.
              Does the description address the specific needs and interests of your target audience? Is the information relevant and appropriate for their level of understanding?
              
              Trust & Credibility: only provide one score out of 100
              Does the description foster trust and build confidence in your brand and products? Does it avoid exaggerated claims or misleading information?
              
              Completeness: only provide one score out of 100
              Does the description provide all the information users need to make an informed decision about the product? Are there any crucial details missing?
              
              Search Functionality: only provide one score out of 100  
              Does the description integrate keywords and metadata effectively to ensure the product is easily discoverable within your website and through search engines?
              
              Internal linking: only provide one score out of 100
              Are relevant links to complementary products, blog posts, or other resources included for user exploration and deeper engagement?
              
              Call to action clarity: only provide one score out of 100
              Are calls to action (e.g., "Buy Now," "Learn More") clear, concise, and strategically placed to encourage desired user behaviour?
              
              Disclaimer: only provide one score out of 100 
              Does the product use a disclaimer and if so how comprehensive and relevant is it?
              `,
              },
              // {
              //   text: "Factuality & Accuracy: only provide one score out of 100",
              // },
              // {
              //   text: "Evidence-based claims: only provide one score out of 100",
              // },

              // {
              //   text: "Transparency & Disclosure: only provide one score out of 100",
              // },
              // {
              //   text: "Clarity & Readability: only provide one score out of 100",
              // },
              // {
              //   text: "Engagement & Tone: only provide one score out of 100",
              // },
              // {
              //   text: "Structure & Layout: only provide one score out of 100",
              // },
              // {
              //   text: "Visual Hierarchy: only provide one score out of 100",
              // },
              // {
              //   text: "Imagery & Multimedia: only provide one score out of 100",
              // },
              // {
              //   text: "Accessibility: only provide one score out of 100",
              // },
              // {
              //   text: "Overall Effectiveness: Only provide one score out of 100.",
              // },
              // {
              //   text: "Alignment with Target Audience: Only provide one score out of 100.",
              // },
              // {
              //   text: "Trust & Credibility: only provide one score out of 100",
              // },
              // {
              //   text: "Completeness: only provide one score out of 100",
              // },
              // {
              //   text: "Search Functionality: only provide one score out of 100",
              // },
              // {
              //   text: "Internal linking: only provide one score out of 100",
              // },
              // {
              //   text: "Call to action clarity: only provide one score out of 100",
              // },
              // {
              //   text: "Disclaimer: only provide one score out of 100",
              // },
              {
                text: "get score value from above content and remove remaining content",
              },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[runBardGetBlogScore] --API---ERROR---- --", err);
    });
  if (!r) {
    return "";
  }
  let { data, headers } = r;
  if (!data) {
    return "";
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log(parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log(text);
    return text;
  }
  return "";
};

exports.runBardGeUHPImpDescription = async (description = "", score = {}) => {
  console.log("AI - [runBardGeUHPImpDescription] generating...  ");

  let query = getMySqlQuery();
  let results = await query(`SELECT * FROM settings where code=? and prop=?`, [
    "bardai",
    "ai_uhp_text",
  ]);
  let aitext = JSON.parse(results?.[0]?.value || "");
  aitext = aitext.replace("[[DESCRIPTION]]", description);

  aitext = aitext.replace(
    "[[factualityaccuracy]]",
    score?.factualityaccuracy || 0
  );
  aitext = aitext.replace(
    "[[evidencebasedclaims]]",
    score?.evidencebasedclaims || 0
  );
  aitext = aitext.replace(
    "[[transparencydisclosure]]",
    score?.transparencydisclosure || 0
  );
  aitext = aitext.replace(
    "[[clarityreadability]]",
    score?.clarityreadability || 0
  );
  aitext = aitext.replace("[[engagementtone]]", score?.engagementtone || 0);
  aitext = aitext.replace("[[structurelayout]]", score?.structurelayout || 0);
  aitext = aitext.replace("[[visualhierarchy]]", score?.visualhierarchy || 0);
  aitext = aitext.replace(
    "[[imagerymultimedia]]",
    score?.imagerymultimedia || 0
  );
  aitext = aitext.replace("[[accessibility]]", score?.accessibility || 0);
  aitext = aitext.replace(
    "[[overalleffectiveness]]",
    score?.overalleffectiveness || 0
  );
  aitext = aitext.replace(
    "[[alignmentwithtargetaudience]]",
    score?.alignmentwithtargetaudience || 0
  );
  aitext = aitext.replace("[[trustcredibility]]", score?.trustcredibility || 0);
  aitext = aitext.replace("[[completeness]]", score?.completeness || 0);
  aitext = aitext.replace(
    "[[searchfunctionality]]",
    score?.searchfunctionality || 0
  );
  aitext = aitext.replace("[[internallinking]]", score?.internallinking || 0);
  aitext = aitext.replace(
    "[[calltoactionclarity]]",
    score?.calltoactionclarity || 0
  );
  aitext = aitext.replace("[[disclaimer]]", score?.disclaimer || 0);
  // console.log('---------------------');
  // console.log(aitext);
  // console.log('---------------------');
  // return "";
  const result = await axios
    .post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: aitext,
              },
            ],
          },
        ],
      }
    )
    .catch((err) => {
      console.log("[runBardGeUHPImpDescription] --API---ERROR---- --", err);
    });
  if (!result) {
    return "";
  }
  let { data, headers } = result;
  if (!data) {
    return "";
  }
  // console.log(data);
  let parts = data.candidates?.[0]?.content?.parts;
  // console.log('parts',parts);
  if (parts) {
    let text = parts.map((d) => d.text).join("\n");
    // console.log('text',text)

    let aitext1 = `add appropriate html tags only don't add additional text in below description. only use UI for points, <p> tag and any of h3,h4,h5 not necessary needs to have html in below content if has tags already exist.
    
    ${text}
    `;
    // console.log('aitext1',aitext1)
    const result1 = await axios
      .post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDL56FPrL70KC_AY-S8mrBAFuI5rEZzPlE",
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: aitext1,
                },
              ],
            },
          ],
        }
      )
      .catch((err) => {
        console.log("[runBardGeUHPImpDescription] --API---ERROR---- --", err);
      });
    if (!result1) {
      return "";
    }
    let { data:data1, headers } = result1;
    // console.log('data1',data1)
    if (!data1) {
      return "";
    }
    // console.log(data1);
    let parts1 = data1.candidates?.[0]?.content?.parts;
    // console.log(parts);
    if (parts1) {
      let text1 = parts1.map((d) => d.text).join("\n");
      // console.log(text)
      return text1;
    }

    // return text;
  }

  return "";
};
