// api/find-alternative.js
// Searches the web for healthier alternatives and returns direct purchase links

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { product_name, search_type } = req.body;

    if (!product_name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    // search_type: "healthier" or "cheapest"
    const isHealthier = search_type === "healthier";

    const searchQuery = isHealthier
      ? `best organic natural ${product_name} buy online`
      : `cheapest ${product_name} best price buy online`;

    const systemPrompt = isHealthier
      ? `You are a health-conscious shopping assistant. Search for the healthiest, most natural/organic version of the requested product. 
         Find products from trusted retailers like:
         - Whole Foods / Amazon Fresh
         - Thrive Market
         - iHerb
         - Vitacost
         - Target
         - Walmart
         - Costco
         - Direct brand websites
         
         Return ONLY a JSON object with:
         {
           "product_name": "exact product name found",
           "brand": "brand name",
           "price": "$XX.XX",
           "retailer": "store name",
           "url": "direct URL to product page",
           "why_healthier": "brief explanation of health benefits",
           "certifications": ["organic", "non-gmo", etc]
         }
         
         IMPORTANT: The URL must be a real, direct link to the product page. Do not make up URLs.`
      : `You are a bargain-hunting shopping assistant. Search for the cheapest price for the requested product from trusted retailers.
         Search retailers like:
         - Amazon
         - Walmart
         - Target
         - Costco
         - Grocery outlet stores
         - Direct brand websites
         
         Return ONLY a JSON object with:
         {
           "product_name": "exact product name found",
           "brand": "brand name", 
           "price": "$XX.XX",
           "original_price": "$XX.XX if on sale",
           "savings": "XX% off or $X savings",
           "retailer": "store name",
           "url": "direct URL to product page",
           "notes": "any relevant deal info"
         }
         
         IMPORTANT: The URL must be a real, direct link to the product page. Do not make up URLs.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5
        }
      ],
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Find the ${isHealthier ? 'healthiest/most organic' : 'cheapest'} version of: ${product_name}. Search for it online and provide a direct purchase link.`
        }
      ]
    });

    // Extract the text response
    let resultText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        resultText += block.text;
      }
    }

    // Try to parse as JSON
    try {
      const cleanJson = resultText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      return res.status(200).json({
        success: true,
        search_type: search_type,
        result: parsed
      });
    } catch (parseError) {
      // Return raw text if not JSON
      return res.status(200).json({
        success: true,
        search_type: search_type,
        result: {
          raw_response: resultText
        }
      });
    }

  } catch (error) {
    console.error("Find alternative error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to search for alternatives"
    });
  }
}
