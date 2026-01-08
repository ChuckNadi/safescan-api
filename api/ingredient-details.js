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
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Provide detailed safety information about: ${ingredientName}

First determine if this is an EDIBLE food ingredient or a non-food/toxic substance.

Return ONLY valid JSON (no markdown):
{
  "name": "Ingredient Name",
  "is_edible": true or false,
  "category": "Category type",
  "safety_level": "SAFE|CAUTION|DANGER|TOXIC",
  "description": "Detailed 2-3 sentence description explaining what this is, how it's made/derived, its purpose, and key safety information",
  "concerns": ["specific concern 1", "specific concern 2"],
  "benefits": ["specific benefit 1", "specific benefit 2"],
  "dosage": {
    "child_6_12": "Specific mg/kg/day or mg/day (e.g., '5 mg/kg/day max' or '100mg daily'). State 'NOT FOR CHILDREN' or 'TOXIC' if applicable",
    "adult_male": "Specific mg/kg/day or mg/day for 70kg adult male (e.g., '350mg daily max')",
    "adult_female": "Specific mg/kg/day or mg/day for 60kg adult female (e.g., '300mg daily max')",
    "toxic_dose": "EXACT amount causing harm with specific symptoms (e.g., '>1000mg: headache, nausea; >5000mg: liver damage, seizures; LD50 in rats: 7000mg/kg'). MUST include numbers and effects."
  },
  "sources": [
    {"title": "Exact page title", "url": "https://real-verified-url.gov/exact-page"}
  ]
}

SAFETY LEVELS:
- TOXIC: Not for human consumption, poisons, industrial chemicals
- DANGER: Known harmful additives (artificial dyes, nitrites, BHA/BHT, etc.)
- CAUTION: Processed additives with some concerns (HFCS, artificial flavors, etc.)
- SAFE: Natural, whole food ingredients, vitamins, minerals

CRITICAL SOURCE RULES:
1. ONLY provide sources if you have the EXACT, REAL URL that exists
2. If you cannot verify a URL is real, return "sources": []
3. NEVER fabricate or guess URLs
4. Acceptable domains: fda.gov, who.int, nih.gov, ncbi.nlm.nih.gov, efsa.europa.eu, cdc.gov
5. URL must go to a specific page about this ingredient, not just the homepage

CRITICAL TOXIC DOSE RULES:
1. MUST provide SPECIFIC numerical values (mg, g, mg/kg body weight)
2. MUST describe what symptoms/effects occur at each toxic threshold
3. Include LD50 (lethal dose for 50% of test animals) if available
4. Include ADI (Acceptable Daily Intake) if established by FDA/WHO/EFSA
5. NEVER use vague terms like "excessive amounts", "too much", "large quantities"
6. If no human data exists, provide animal study data with clear labeling

NON-FOOD SUBSTANCES:
If this is NOT a food ingredient (chemical, poison, cleaning agent, etc.):
- Set "is_edible": false
- Set "safety_level": "TOXIC"
- Still provide toxic dose info for accidental exposure awareness
- Clearly state this is not meant for consumption`
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
