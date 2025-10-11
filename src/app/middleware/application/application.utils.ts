import mongoose from "mongoose";
import AppError from "../../error/AppError";
import { openai } from "../../utils/openAi";
import { Application } from "./application.model";

export const generateAiScoresForJob = async (jobId: string) => {
  const applications = await Application.find({
    jobId,
    aiScore: null,
    isDeleted: false,
  });

  console.log("applications =>>>> ", applications);

  if (applications.length === 0) {
    return { message: "No applications to score" };
  }


  for (const app of applications) {
  
    await generateAiScoreForApplication((app as any)._id.toString());
  }

  return { message: "AI scoring completed" };
};



/* ---------------------------------------------
   Helper: Safely extract JSON from AI response
---------------------------------------------- */
const extractJsonFromAiResponse = (content: string): any => {
  if (!content) return {};

  // Remove markdown code blocks (```json ... ```)
  const cleaned = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('❌ AI JSON parse failed. Raw content:', cleaned);
    return {};
  }
};



/*
|--------------------------------------------------------------------------
| Generate AI Score for Job Application Using gpt-4.1 model
|--------------------------------------------------------------------------
*/

// export const generateAiScoreForApplication = async (
//   applicationId: string
// ) => {
//   /* ---------------------------------------------
//      Validate Application ID
//   ---------------------------------------------- */
//   if (!mongoose.Types.ObjectId.isValid(applicationId)) {
//     throw new AppError(400, 'Invalid application ID');
//   }

//   /* ---------------------------------------------
//      Load Application with Relations
//   ---------------------------------------------- */
//   const application = await Application.findById(applicationId)
//     .populate('candidateId')
//     .populate('jobId');

//   if (!application) {
//     throw new AppError(404, 'Application not found');
//   }

//   /* ---------------------------------------------
//      Prevent Re-Generation (Cost Saving)
//   ---------------------------------------------- */
//   if (
//     application.aiScore !== null &&
//     application.aiScore !== undefined
//   ) {
//     return {
//       applicationId,
//       aiScore: application.aiScore,
//       aiReason: application.aiReason,
//       matchedSkills: application.matchedSkills,
//       aiMatchLevel: application.aiMatchLevel,
//       aiMatchSummary: `AI Match: ${application.aiScore}% - ${application.aiMatchLevel}`,
//     };
//   }

//   const candidate: any = application.candidateId;
//   const job: any = application.jobId;

//   if (!candidate || !job) {
//     throw new AppError(400, 'Candidate or Job data missing');
//   }

//   /* ---------------------------------------------
//      AI Prompt
//   ---------------------------------------------- */
//   const prompt = `
// You are an expert technical recruiter.

// Job Details:
// - Title: ${job.title}
// - Required Skills: ${job.candidateDuties?.join(', ') || 'N/A'}
// - Experience Required: ${job.experience} years
// - Description: ${job.description}

// Candidate Profile:
// - Name: ${candidate.name}
// - Skills: ${candidate.skills?.join(', ') || 'N/A'}
// - Experience: ${candidate.yearsOfExperience} years
// - Designation: ${candidate.designation || 'N/A'}
// - Bio: ${candidate.bio || 'N/A'}

// Tasks:
// 1. Calculate a match score between 0 and 100
// 2. Identify matched skills (intersection of job & candidate skills)
// 3. Decide match level:
//    - 90–100: Highly suitable
//    - 70–89: Suitable
//    - 50–69: Partially suitable
//    - Below 50: Not suitable
// 4. Give a short reason (max 2 lines)

// Respond ONLY in valid JSON:
// {
//   "score": number,
//   "reason": string,
//   "matchedSkills": string[],
//   "matchLevel": string
// }
// `;

//   /* ---------------------------------------------
//      OpenAI Call (GPT-4.1)
//   ---------------------------------------------- */
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4.1',
//     temperature: 0.2,
//     response_format: { type: 'json_object' }, // ✅ forces valid JSON
//     messages: [{ role: 'user', content: prompt }],
//   });

//   const rawContent =
//     response.choices[0]?.message?.content || '{}';

//   const aiResult = extractJsonFromAiResponse(rawContent);

//   /* ---------------------------------------------
//      Normalize & Save AI Result
//   ---------------------------------------------- */
//   application.aiScore = Math.min(
//     100,
//     Math.max(0, Number(aiResult.score) || 0)
//   );

//   application.aiReason =
//     aiResult.reason || 'No reason provided by AI';

//   application.matchedSkills = Array.isArray(
//     aiResult.matchedSkills
//   )
//     ? aiResult.matchedSkills
//     : [];

//   application.aiMatchLevel =
//     aiResult.matchLevel || 'Not suitable';

//   await application.save();

//   /* ---------------------------------------------
//      Debug Log
//   ---------------------------------------------- */
//   console.log({
//     applicationId,
//     aiScore: application.aiScore,
//     aiReason: application.aiReason,
//     matchedSkills: application.matchedSkills,
//     aiMatchLevel: application.aiMatchLevel,
//     aiMatchSummary: `AI Match: ${application.aiScore}% - ${application.aiMatchLevel}`,
//   });

//   /* ---------------------------------------------
//      Final Response
//   ---------------------------------------------- */
//   return {
//     applicationId,
//     aiScore: application.aiScore,
//     aiReason: application.aiReason,
//     matchedSkills: application.matchedSkills,
//     aiMatchLevel: application.aiMatchLevel,
//     aiMatchSummary: `AI Match: ${application.aiScore}% - ${application.aiMatchLevel}`,
//   };
// };

/* ---------------------------------------------
   Main Function
---------------------------------------------- */
export const generateAiScoreForApplication = async (
  applicationId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new AppError(400, 'Invalid application ID');
  }

  const application = await Application.findById(applicationId)
    .populate('candidateId')
    .populate('jobId');

  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  // Optional: prevent re-generation (cost saving)
  if (application.aiScore !== null && application.aiScore !== undefined) {
    return {
      applicationId,
      aiScore: application.aiScore,
      aiReason: application.aiReason,
      matchedSkills: application.matchedSkills,
      aiMatchLevel: application.aiMatchLevel,
    };
  }

  const candidate: any = application.candidateId;
  const job: any = application.jobId;

  if (!candidate || !job) {
    throw new AppError(400, 'Candidate or Job data missing');
  }


  

  /* ---------------------------------------------
     AI Prompt
  ---------------------------------------------- */
  const prompt = `
                  You are an expert technical recruiter.

                  Job Details:
                  Title: ${job.title}
                  Required Skills: ${job.candidateDuties?.join(', ')}
                  Experience Required: ${job.experience} years
                  Description: ${job.description}

                  Candidate Profile:
                  Name: ${candidate.name}
                  Skills: ${candidate.skills?.join(', ')}
                  Experience: ${candidate.yearsOfExperience} years
                  Designation: ${candidate.designation}
                  Bio: ${candidate.bio}

                  Tasks:
                  1. Calculate a match score between 0 and 100
                  2. Identify matched skills (intersection of job & candidate skills)
                  3. Decide match level based on score:
                    - 90–100: Highly suitable
                    - 70–89: Suitable
                    - 50–69: Partially suitable
                    - Below 50: Not suitable
                  4. Give a short reason (max 2 lines)

                  Respond ONLY in JSON format:
                  {
                    "score": number,
                    "reason": string,
                    "matchedSkills": string[],
                    "matchLevel": string
                  }
                  `;

  /* ---------------------------------------------
     OpenAI Call
  ---------------------------------------------- */
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // gpt-4o-mini
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawContent = response.choices[0]?.message?.content || '';
  const aiResult = extractJsonFromAiResponse(rawContent);

  /* ---------------------------------------------
     Save AI Result
  ---------------------------------------------- */
  application.aiScore = Number(aiResult.score) || 0;
  application.aiReason =
    aiResult.reason || 'No reason provided by AI';
  application.matchedSkills =
    Array.isArray(aiResult.matchedSkills)
      ? aiResult.matchedSkills
      : [];
  application.aiMatchLevel =
    aiResult.matchLevel || 'Not suitable';

  await application.save();



  console.log({
    applicationId,
    aiScore: application.aiScore,
    aiReason: application.aiReason,
    matchedSkills: application.matchedSkills,
    aiMatchLevel: application.aiMatchLevel,
    aiMatchSummary: `AI Match: ${application.aiScore}% - ${application.aiMatchLevel}`,
  })

  /* ---------------------------------------------
     Final Response
  ---------------------------------------------- */
  return {
    applicationId,
    aiScore: application.aiScore,
    aiReason: application.aiReason,
    matchedSkills: application.matchedSkills,
    aiMatchLevel: application.aiMatchLevel,
    aiMatchSummary: `AI Match: ${application.aiScore}% - ${application.aiMatchLevel}`,
  };
};





// export const generateAiScoreForApplication = async (applicationId: string) => {
//   const application = await Application.findById(applicationId)
//     .populate("candidateId")
//     .populate("jobId");

//   if (!application) {
//     throw new AppError(404, "Application not found");
//   }


//   const candidate: any = application.candidateId;
//   const job: any = application.jobId;

//   console.log({application});

//   if (!candidate || !job) {
//     throw new AppError(400, "Candidate or Job data missing");
//   }

//   // 🔹 Prepare AI Prompt
//     const prompt = `
//         You are an expert technical recruiter.

//         Job Details:
//         Title: ${job.title}
//         Required Skills: ${job.skillsRequired?.join(', ')}
//         Experience Required: ${job.experience} years
//         Description: ${job.description}

//         Candidate Profile:
//         Name: ${candidate.name}
//         Skills: ${candidate.skills?.join(', ')}
//         Experience: ${candidate.yearsOfExperience} years
//         Designation: ${candidate.designation}
//         Bio: ${candidate.bio}

//         Tasks:
//         1. Calculate a match score between 0 and 100
//         2. Identify matched skills (intersection of job & candidate skills)
//         3. Decide match level based on score:
//           - 90–100: Highly suitable
//           - 70–89: Suitable
//           - 50–69: Partially suitable
//           - Below 50: Not suitable
//         4. Give a short reason (max 2 lines)

//         Respond ONLY in JSON format:
//         {
//           "score": number,
//           "reason": string,
//           "matchedSkills": string[],
//           "matchLevel": string
//         }
//         `;

//   // 🔹 Call OpenAI
//   const response = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     temperature: 0.2,
//     messages: [{ role: "user", content: prompt }],
//   });

//   console.log("response ==>>> ", response);
//   const choices = response.choices[0];

//   console.log("===================================================================")
//   console.dir(choices);
//   const aiResult = JSON.parse(response.choices[0]?.message?.content || "{}");



//   console.log("aiResult ==>>> ", aiResult);

//   // 🔹 Save result
//   application.aiScore = aiResult.score ?? 0;
//   application.aiReason = aiResult.reason ?? "No reason provided";
//   application.matchedSkills = aiResult.matchedSkills ?? [];
//   application.aiMatchLevel = aiResult.matchLevel ?? "Not suitable";

//   console.log(application);

//   await application.save();

//   return {
//     applicationId,
//     aiScore: application.aiScore,
//     aiReason: application.aiReason,
//     matchedSkills: application.matchedSkills,
//     aiMatchLevel: application.aiMatchLevel,
//   };
// };