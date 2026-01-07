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
          content: `Provide safety info for food ingredient: ${ingredientName}

Return ONLY JSON:
{
  "name": "Name",
  "category": "Category",
  "safety_level": "SAFE|CAUTION|DANGER",
  "description": "Description",
  "concerns": ["concern"],
  "benefits": ["benefit"],
  "dosage": {
    "child_6_12": "Amount",
    "adult_male": "Amount", 
    "adult_female": "Amount",
    "toxic_dose": "Amount"
  },
  "sources": [{"title": "Source", "url": "https://url.gov"}]
}`
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices?.[0]?.message?.content) {
      const text = data.choices[0].message.content.replace(/```json|```/g, '').trim();
      return res.status(200).json({ success: true, data: JSON.parse(text) });
    }
    
    return res.status(500).json({ error: 'No response from AI' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}
