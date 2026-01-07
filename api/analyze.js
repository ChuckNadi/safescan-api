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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` }
            },
            {
              type: "text",
              text: `Analyze this food label image. Return ONLY valid JSON (no markdown):

{
  "product_name": "Brand and Product Name",
  "ingredients": [
    {
      "name": "Ingredient Name",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Vitamin/Mineral|Fat/Oil|Base|Sodium|Ingredient",
      "safety_level": "SAFE|CAUTION|DANGER",
      "description": "2-3 sentence description",
      "concerns": ["concern 1", "concern 2"],
      "benefits": ["benefit 1", "benefit 2"],
      "dosage": {
        "child_6_12": "Safe amount for children",
        "adult_male": "Safe amount for adult males",
        "adult_female": "Safe amount for adult females",
        "toxic_dose": "Amount that causes harm"
      },
      "sources": [{"title": "Source", "url": "https://source.gov"}]
    }
  ],
  "allergens": ["milk", "soy"],
  "warnings": ["Warning 1"]
}

Safety levels:
- DANGER: Red 40, Yellow 5, Blue 1, sodium nitrite, BHA, BHT, aspartame, MSG, hydrogenated oils, TBHQ
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, palm oil, caramel color
- SAFE: Natural ingredients, vitamins, minerals, whole foods

If not a food label: {"error": "NO_INGREDIENTS_FOUND"}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices?.[0]?.message?.content) {
      return res.status(200).json({ success: true, content: data.choices[0].message.content });
    }
    
    return res.status(500).json({ error: 'No response from AI' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}
