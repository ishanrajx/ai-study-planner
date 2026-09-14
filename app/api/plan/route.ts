import { NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

const token = process.env.HF_TOKEN;

if (!token) {
  throw new Error("HF_TOKEN is not configured.");
}

const hf = new InferenceClient(token);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const subject = String(body.subject ?? "").trim();
    const examDate = String(body.examDate ?? "").trim();
    const hoursPerDay = Number(body.hoursPerDay);

    if (!subject || !examDate || !Number.isFinite(hoursPerDay)) {
      return NextResponse.json(
        {
          error:
            "Please provide a subject, exam date, and daily study time.",
        },
        { status: 400 }
      );
    }

    const exam = new Date(`${examDate}T00:00:00`);
    const today = new Date();

    const difference = exam.getTime() - today.getTime();
    const calculatedDays = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    if (calculatedDays < 1) {
      return NextResponse.json(
        { error: "The exam date must be in the future." },
        { status: 400 }
      );
    }

    const studyDays = Math.min(Math.max(calculatedDays, 1), 14);

    const prompt = `
Create a practical study plan for a university student.

Subject: ${subject}
Exam date: ${examDate}
Available study time: ${hoursPerDay} hours per day
Number of available study days: ${studyDays}

Create exactly ${studyDays} days.

For every day include:
- day number
- a short title
- important topics
- specific tasks
- estimated hours

Also include:
- an overall title
- a short summary
- totalDays
- dailyHours
- a revisionStrategy array

Rules:
- Prioritize important concepts.
- Include learning, active recall, practice and revision.
- Do not exceed the available daily study time.
- Keep tasks realistic and actionable.
- Make the final days focused on revision and practice.

Return ONLY valid JSON in exactly this structure:

{
  "title": "string",
  "summary": "string",
  "totalDays": number,
  "dailyHours": number,
  "days": [
    {
      "day": number,
      "title": "string",
      "topics": ["string"],
      "tasks": ["string"],
      "estimatedHours": number
    }
  ],
  "revisionStrategy": ["string"]
}
`;

    const response = await hf.chatCompletion({
      model: "openai/gpt-oss-120b:fastest",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful academic study planner. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2500,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "The AI returned an empty response." },
        { status: 502 }
      );
    }

    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const plan = JSON.parse(cleaned);

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Study plan generation failed:", error);

    return NextResponse.json(
      {
        error:
          "We couldn't generate your study plan right now. Please try again.",
      },
      { status: 500 }
    );
  }
}