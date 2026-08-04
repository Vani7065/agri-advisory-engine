import os
import logging
import random
from datetime import datetime, timedelta
import requests
from pathlib import Path
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("MandiService")

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    logger.warning(f".env file not found at {env_path}. Relying on system environment variables.")

# Retrieve configurations
OGD_API_KEY = os.getenv("OGD_API_KEY")
OGD_MANDI_RESOURCE_ID = os.getenv("OGD_MANDI_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")

def _get_mock_mandi_price(crop: str, state: str, district: str) -> dict:
    """
    Generates realistic, deterministic mock mandi price data based on crop, state, and district.
    Ensures testing produces plausible price numbers and schemas.
    """
    c = crop.strip().lower()
    s = state.strip().lower()
    d = district.strip().lower()
    
    # Standard MSP (Minimum Support Price) or market average bases for crops in INR/Quintal (100kg)
    base_prices = {
        "wheat": 2275.0,
        "rice": 2200.0,
        "paddy": 2183.0,
        "cotton": 6620.0,
        "onion": 1800.0,
        "potato": 1300.0,
        "tomato": 2200.0,
        "maize": 2090.0,
        "mustard": 5650.0,
        "soyabean": 4600.0,
        "gram": 5440.0,
        "tur": 7000.0,
        "arhar": 7000.0,
        "moong": 8558.0
    }
    
    # Use baseline or default price
    base_price = base_prices.get(c, 2500.0)
    
    # Seed RNG deterministically based on query terms
    seed_str = f"{c}_{s}_{d}"
    seed_val = sum(ord(char) for char in seed_str)
    rng = random.Random(seed_val)
    
    # State-based adjustments
    # E.g. Punjab/Haryana might have better yields/pricing for grains
    state_multipliers = {
        "punjab": 1.05,
        "haryana": 1.04,
        "maharashtra": 0.98,
        "uttar pradesh": 1.01,
        "rajasthan": 0.96,
        "madhya pradesh": 0.97
    }
    state_multiplier = state_multipliers.get(s, rng.uniform(0.95, 1.05))
    
    # District and random daily fluctuation
    district_multiplier = rng.uniform(0.97, 1.03)
    daily_fluctuation = rng.uniform(-0.02, 0.02)
    
    final_price = base_price * state_multiplier * district_multiplier * (1 + daily_fluctuation)
    final_price = round(final_price, 2)
    
    # Make a market name
    market_name = f"{district.strip().title()} Mandi"
    
    # Random date within last 3 days
    days_ago = rng.randint(0, 2)
    latest_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    
    return {
        "crop": crop.strip().title(),
        "market": market_name,
        "price": final_price,
        "date": latest_date
    }

def fetch_mandi_price(crop: str, state: str, district: str) -> dict:
    """
    Fetches the latest mandi price for the specified crop, state, and district.
    Integrates with the official data.gov.in AGMARKNET API if OGD_API_KEY is configured.
    Otherwise, falls back to realistic, deterministic mock mandi price data.
    
    Args:
        crop (str): Name of the crop (e.g., 'Wheat', 'Onion').
        state (str): Name of the Indian state (e.g., 'Haryana', 'Maharashtra').
        district (str): Name of the district (e.g., 'Ambala', 'Nashik').
        
    Returns:
        dict: A dictionary containing crop, market, price (per quintal), and date.
    """
    # Clean inputs
    crop = crop.strip()
    state = state.strip()
    district = district.strip()
    
    if not crop or not state or not district:
        logger.error("Missing required parameters in fetch_mandi_price.")
        return _get_mock_mandi_price(crop or "Unknown", state or "Unknown", district or "Unknown")

    if not OGD_API_KEY or OGD_API_KEY.strip() == "your_data_gov_in_api_key_here" or not OGD_API_KEY.strip():
        logger.info("OGD India API key is missing. Using mock mandi price data.")
        return _get_mock_mandi_price(crop, state, district)

    base_url = f"https://api.data.gov.in/resource/{OGD_MANDI_RESOURCE_ID}"
    
    # Set up filters with Title Case as government databases standardise on Title Case
    params = {
        "api-key": OGD_API_KEY,
        "format": "json",
        "limit": 50,  # Retrieve small batch to filter/process latest date
        "filters[State]": state.title(),
        "filters[District]": district.title(),
        "filters[Commodity]": crop.title()
    }

    try:
        logger.info(f"Querying OGD API for crop: {crop}, state: {state}, district: {district}")
        response = requests.get(base_url, params=params, timeout=12)
        
        # Check success
        if response.status_code == 200:
            data = response.json()
            records = data.get("records", [])
            
            # If no records, retry with UPPERCASE values (common in OGD datasets)
            if not records:
                logger.info("No records found with Title Case filters. Retrying with UPPERCASE filters.")
                params["filters[State]"] = state.upper()
                params["filters[District]"] = district.upper()
                params["filters[Commodity]"] = crop.upper()
                
                response = requests.get(base_url, params=params, timeout=12)
                if response.status_code == 200:
                    data = response.json()
                    records = data.get("records", [])

            # Parse records if found
            if records:
                # Helper function to parse date safely for sorting
                def get_record_date(rec):
                    date_val = rec.get("arrival_date", rec.get("Arrival_Date", ""))
                    if not date_val:
                        return datetime.min
                    try:
                        # Mandi prices are usually stored in DD/MM/YYYY format
                        return datetime.strptime(str(date_val), "%d/%m/%Y")
                    except ValueError:
                        try:
                            # Try YYYY-MM-DD as fallback
                            return datetime.strptime(str(date_val), "%Y-%m-%d")
                        except ValueError:
                            return datetime.min

                # Sort by date descending to get the newest record first
                records.sort(key=get_record_date, reverse=True)
                latest_record = records[0]
                
                # Fetch fields dynamically supporting both camel/title case and lowercase
                market = latest_record.get("market", latest_record.get("Market", f"{district} APMC")).title()
                
                # Extract price. Preferred order: Modal_Price -> Average of Max & Min -> Min
                price_val = None
                for key in ["modal_price", "Modal_Price"]:
                    val = latest_record.get(key)
                    if val is not None and str(val).strip():
                        price_val = val
                        break
                        
                if price_val is None:
                    max_p = latest_record.get("max_price", latest_record.get("Max_Price"))
                    min_p = latest_record.get("min_price", latest_record.get("Min_Price"))
                    if max_p is not None and min_p is not None:
                        try:
                            price_val = (float(max_p) + float(min_p)) / 2
                        except (ValueError, TypeError):
                            pass
                
                # Convert final price to float/int
                try:
                    price = float(price_val) if price_val is not None else 0.0
                except (ValueError, TypeError):
                    price = 0.0

                # Formulate date
                raw_date = latest_record.get("arrival_date", latest_record.get("Arrival_Date", ""))
                try:
                    formatted_date = datetime.strptime(str(raw_date), "%d/%m/%Y").strftime("%Y-%m-%d")
                except ValueError:
                    formatted_date = str(raw_date) if raw_date else datetime.now().strftime("%Y-%m-%d")

                logger.info(f"Successfully retrieved mandi price from OGD API for '{crop}' in '{market}'.")
                return {
                    "crop": crop.title(),
                    "market": market,
                    "price": price,
                    "date": formatted_date
                }
            else:
                logger.warning("OGD API returned 200 OK but no records matched parameters. Using mock.")
                return _get_mock_mandi_price(crop, state, district)
        else:
            logger.error(f"OGD API returned status code {response.status_code}: {response.text}")
            logger.info("Falling back to mock mandi price data.")
            return _get_mock_mandi_price(crop, state, district)

    except requests.exceptions.Timeout:
        logger.error("OGD API request timed out. Falling back to mock mandi price data.")
        return _get_mock_mandi_price(crop, state, district)
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error calling OGD API: {e}. Falling back to mock mandi price data.")
        return _get_mock_mandi_price(crop, state, district)
    except Exception as e:
        logger.error(f"Unexpected error in fetch_mandi_price: {e}. Falling back to mock mandi price data.")
        return _get_mock_mandi_price(crop, state, district)
