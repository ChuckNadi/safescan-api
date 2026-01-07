export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ingredientName } = req.body;

    if (!ingredientName) {
      return res.status(400).json({ error: 'No ingredient name provided' });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Provide detailed safety information about the food ingredient: ${ingredientName}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "name": "Ingredient Name",
  "category": "Category type",
  "safety_level": "SAFE or CAUTION or WARNING or DANGER",
  "description": "Detailed 2-3 sentence description explaining what this ingredient is, how it's made, why it's used in food products, and any important information consumers should know",
  "concerns": ["concern1", "concern2"],
  "benefits": ["benefit1", "benefit2"],
  "dosage": {
    "child_6_12": "X mg/kg or amount per day",
    "adult_male": "X mg/kg or amount per day",
    "adult_female": "X mg/kg or amount per day",
    "toxic_dose": "Amount that causes harm"
  },
  "sources": [
    {"title": "Source name", "url": "https://example.com"}
  ]
}

If this is a dangerous ingredient, safety_level should be DANGER or WARNING.
Include 2-3 credible sources (FDA, WHO, medical journals, or .gov/.edu sites).`
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const text = data.choices[0].message.content;
      const cleanText = text.replace(/```json|```/g, '').trim();
      return res.status(200).json({ success: true, data: JSON.parse(cleanText) });
    }
    
    return res.status(500).json({ error: 'No response from AI' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}
