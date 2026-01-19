// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * THIS IS AN EXAMPLE CONTRACT THAT USES HARDCODED VALUES FOR CLARITY.
 * THIS IS AN EXAMPLE CONTRACT THAT USES UN-AUDITED CODE.
 * DO NOT USE THIS CODE IN PRODUCTION.
 */
abstract contract FunctionsSource {
    string public getNftMetadata =
        "const { ethers } = await import('npm:ethers@6.10.0');"
        "const Hash = await import('npm:ipfs-only-hash@4.0.0');"
        "try {"
        "  const apiResponse = await Functions.makeHttpRequest({"
        "    url: `https://api.bridgedataoutput.com/api/v2/OData/test/Property('P_69179ef9b7bb783d6039ab66')?access_token=6baca547742c6f96a6ff71b138424f21`,"
        "    timeout: 5000,"
        "  });"
        "  if (!apiResponse || !apiResponse.data) {"
        "    throw new Error('API response is invalid');"
        "  }"
        "  const data = apiResponse.data;"
        "  const realEstateAddress = data.UnparsedAddress || '';"
        "  const yearBuilt = Number(data.YearBuilt) || 0;"
        "  const lotSizeSquareFeet = Number(data.LotSizeSquareFeet) || 0;"
        "  const livingArea = Number(data.LivingArea) || 0;"
        "  const bedroomsTotal = Number(data.BedroomsTotal) || 0;"
        "  const metadata = {"
        "    name: `Real Estate Token`,"
        "    attributes: ["
        "      { trait_type: `realEstateAddress`, value: realEstateAddress },"
        "      { trait_type: `yearBuilt`, value: yearBuilt },"
        "      { trait_type: `lotSizeSquareFeet`, value: lotSizeSquareFeet },"
        "      { trait_type: `livingArea`, value: livingArea },"
        "      { trait_type: `bedroomsTotal`, value: bedroomsTotal }"
        "    ]"
        "  };"
        "  const metadataString = JSON.stringify(metadata);"
        "  const ipfsCid = await Hash.of(metadataString);"
        "  return Functions.encodeString(`ipfs://${ipfsCid}`);"
        "} catch (error) {"
        "  console.error('Error in getNftMetadata:', error);"
        "  throw new Error(`API request failed: ${error.message}`);"
        "}";

    string public getPrices =
        "const { ethers } = await import('npm:ethers@6.10.0');"
        "const abiCoder = ethers.AbiCoder.defaultAbiCoder();"
        "const tokenId = args[0];"
        "try {"
        "  const apiResponse = await Functions.makeHttpRequest({"
        "    url: `https://api.bridgedataoutput.com/api/v2/OData/test/Property('P_69179ef9b7bb783d6039ab66')?access_token=6baca547742c6f96a6ff71b138424f21`,"
        "    timeout: 5000,"
        "  });"
        "  if (!apiResponse || !apiResponse.data) {"
        "    throw new Error('API response is invalid');"
        "  }"
        "  const data = apiResponse.data;"
        "  const listPrice = Number(data.ListPrice) || 0;"
        "  const originalListPrice = Number(data.OriginalListPrice) || 0;"
        "  const taxAssessedValue = Number(data.TaxAssessedValue) || 0;"
        "  const encoded = abiCoder.encode([`uint256`, `uint256`, `uint256`, `uint256`], [tokenId, listPrice, originalListPrice, taxAssessedValue]);"
        "  return ethers.getBytes(encoded);"
        "} catch (error) {"
        "  console.error('Error in getPrices:', error);"
        "  throw new Error(`API request failed: ${error.message}`);"
        "}";
}
