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
              text: `Analyze this food label image. Return ONLY valid JSON (no markdown, no explanation):

{
  "product_name": "Brand and Product Name",
  "ingredients": [
    {
      "name": "Ingredient Name",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient",
      "safety_level": "SAFE|CAUTION|DANGER",
      "description": "Detailed 2-3 sentence description explaining what this ingredient is, how it's made, why it's used in food products, and any important information consumers should know",
      "concerns": ["specific health concern 1", "specific health concern 2"],
      "benefits": ["specific benefit 1", "specific benefit 2"],
      "dosage": {
        "child_6_12": "Suggested Safe daily amount for children",
        "adult_male": "Suggested Safe daily amount for adult males",
        "adult_female": "Suggested Safe daily amount for adult females",
        "toxic_dose": "Specific Amount that may cause harm"
      },
      "sources": [
        {"title": "FDA or WHO or scientific source", "url": "https://actual-source-url.gov"}
      ]
    }
  ],
  "allergens": ["milk", "soy", "wheat"],
  "warnings": ["Contains artificial colors", "High sodium content"]
}

Safety level guidelines:
- DANGER: Artificial dyes (Red 40, Yellow 5, Blue 1), sodium nitrite/nitrate, BHA, BHT, aspartame, MSG, partially hydrogenated oils, brominated vegetable oil, TBHQ, titanium dioxide
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, palm oil, excessive sodium, caramel color, potassium sorbate, sodium benzoate
- SAFE: Natural ingredients, vitamins, minerals, water, basic whole foods

Include real dosage data and credible sources (FDA, WHO, NIH, .gov, .edu) for each ingredient.

If image is blurry or not a food label, return: {"error": "NO_INGREDIENTS_FOUND"}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return res.status(200).json({ success: true, content: data.choices[0].message.content });
    }
    
    return res.status(500).json({ error: 'No response from AI' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
}
