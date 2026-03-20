module.exports = async function handler(req, res) {
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
        max_tokens: 3500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${image}` }
            },
            {
              type: "text",
              text: `You are a precise ingredient extraction tool. Your job is to read food labels EXACTLY as written.

BARCODE EXTRACTION - CRITICAL:
1. ACTIVELY LOOK for barcodes/UPC codes in the image
2. Look in corners, edges, bottom, back of package
3. UPC-A: 12 digits (most common in US)
4. EAN-13: 13 digits (international)
5. UPC-E: 8 digits (compact)
6. The number is usually PRINTED BELOW the barcode lines
7. If you see ANY numbers near black/white lines, extract them
8. Set "barcode_confidence": "high" if clearly visible, "medium" if partial, "low" if guessing, "none" if not found

CRITICAL EXTRACTION RULES:
1. ONLY list ingredients you can CLEARLY READ in the image
2. NEVER guess or make up ingredients
3. NEVER add ingredients that aren't visible
4. If you cannot read an ingredient clearly, mark it as "unreadable_[position]"
5. If the image is blurry or cut off, say which parts are unreadable
6. Extract ingredients in the EXACT ORDER they appear on the label
7. Include ALL ingredients - do not skip any
8. Include sub-ingredients in parentheses

SAFETY CHECK:
- If this is NOT a food product (cleaning supplies, chemicals, medicine, poison), set "is_edible": false
- If this IS a food product meant for human consumption, set "is_edible": true

Return ONLY valid JSON (no markdown):

{
  "is_edible": true,
  "product_name": "EXACT brand and product name as shown on package",
  "product_name_source": "label_text|packaging|inferred|unknown",
  "barcode": "barcode number if visible, or null",
  "barcode_confidence": "high|medium|low|none",
  "product_type": "food|beverage|supplement|cleaning_product|chemical|prescription_drug|otc_medicine|cosmetic|unknown",
  "warning_message": null,
  "extraction_confidence": "high|medium|low",
  "unreadable_sections": ["list any parts of label that were cut off or blurry"],
  "raw_ingredients_text": "Copy the EXACT ingredients text as written on the label",
  "ingredients": [
    {
      "name": "EXACT ingredient name as written on label",
      "category": "Preservative|Sweetener|Coloring|Flavoring|Emulsifier|Thickener|Acidulant|Vitamin/Mineral|Fat/Oil|Base|Sodium|Allergen|Ingredient|Chemical|Toxic",
      "safety_level": "SAFE|CAUTION|DANGER|TOXIC",
      "description": "What this ingredient is and why it's used",
      "concerns": ["specific health concern if any"],
      "benefits": ["specific benefit if any"]
    }
  ],
  "total_ingredients_found": 0,
  "allergens": ["ONLY allergens explicitly stated on label"],
  "warnings": ["ONLY warnings explicitly stated on label"],
  "amazon_search": "exact product name for accurate Amazon search",
  "healthier_alternative": {
    "name": "Specific healthier product name (organic/natural version)",
    "description": "Why this is healthier - no artificial ingredients, organic, etc",
    "url": "https://www.iherb.com/search?kw=PRODUCT+NAME",
    "retailer": "iHerb",
    "price": "Check Price"
  },
  "cheapest_option": {
    "name": "Specific product name - store brand or best deal",
    "description": "Best value - same quality for less",
    "url": "https://www.walmart.com/search?q=PRODUCT+NAME",
    "retailer": "Walmart",
    "price": "Check Price"
  }
}

SAFETY LEVELS:
- TOXIC: Non-food items, poisons, chemicals not meant for consumption
- DANGER: Artificial dyes (Red 40, Yellow 5, Yellow 6, Blue 1), sodium nitrite, BHA, BHT, aspartame, MSG, partially hydrogenated oils, TBHQ, titanium dioxide
- CAUTION: High fructose corn syrup, carrageenan, artificial flavors, natural flavors, palm oil, caramel color, sodium benzoate
- SAFE: Water, salt, sugar, flour, whole foods, vitamins, minerals, spices, natural oils

HEALTHIER ALTERNATIVE:
- Suggest an organic/natural version of this product
- Use search URL: https://www.iherb.com/search?kw=PRODUCT+NAME (replace PRODUCT+NAME with actual product)
- Set retailer to "iHerb" and price to "Check Price"

CHEAPEST OPTION:
- Suggest a store brand or budget version
- Use search URL: https://www.walmart.com/search?q=PRODUCT+NAME (replace PRODUCT+NAME with actual product)
- Set retailer to "Walmart" and price to "Check Price"

If image is not a food label: {"error": "NOT_A_FOOD_LABEL"}
If image is too blurry: {"error": "IMAGE_TOO_BLURRY", "suggestion": "Please take a clearer photo"}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return res.status(200).json({ success: true, content: data.choices[0].message.content });
    }
    
    console.log('OpenRouter response:', JSON.stringify(data).substring(0, 500));
    return res.status(500).json({ error: 'No response from AI', debug: data });
    
  } catch (error) {
    console.error('Catch error:', error.message);
    return res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
};
