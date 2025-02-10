import { CoinData } from "@/store/useMarketStore";

/**
 * 숫자를 한국 원화 형식으로 포맷팅합니다.
 * @param amount 포맷팅할 금액
 * @returns 포맷팅된 원화 문자열 (예: ₩1,234,567)
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

/**
 * 숫자를 한국 원화의 양식으로 조, 억, 만, 천원 단위로 변환합니다.
 * @param amount 포맷팅할 금액
 * @returns 포맷팅된 원화 문자열 (예: ₩1,234,567)
 */
export function formatKRWWithUnit(amount: number): string {
  if (amount === null || amount === undefined) {
    return "0";
  }

  if (amount >= 1_000_000_000_000) {
    return `${(amount / 1_000_000_000_000).toFixed(2)}조`;
  }
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(2)}억`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}백만`;
  }
  if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(2)}만`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}천`;
  }
  return `${amount.toFixed(2)}`;
}
/**
 * 숫자를 암호화폐 수량 형식으로 포맷팅합니다.
 * @param amount 포맷팅할 수량
 * @returns 포맷팅된 수량 문자열 (예: 0.00123456)
 */
export function formatCrypto(amount: number): string {
  if (amount === null || amount === undefined) {
    return "0";
  }
  return amount.toFixed(8);
}

/**
 * 숫자를 USD 형식으로 포맷팅합니다.
 * @param amount 포맷팅할 금액
 * @returns 포맷팅된 달러 문자열 (예: $1,234.56)
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }

  return `$${value.toFixed(2)}`;
}

type QuoteToken = "KRW" | "USDT" | "BTC";

interface Market {
  exchange: "upbit" | "bithumb" | "binance";
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

export type ExchangePair = {
  from: "upbit" | "bithumb" | "binance";
  fromBase: string;
  to: "upbit" | "bithumb" | "binance";
  toBase: string;
};

/**
 * 마켓 가격을 지정된 기준 화폐로 변환
 */
export function convertPrice(
  price: number,
  fromQuote: QuoteToken,
  toQuote: QuoteToken,
  exchangeRates: {
    USDT: { KRW: number };
    BTC: { KRW: number; USDT: number };
  }
): number {
  if (fromQuote === toQuote) return price;

  // BTC로 변환
  if (fromQuote === "BTC") {
    if (toQuote === "KRW") return price * exchangeRates.BTC.KRW;
    if (toQuote === "USDT") return price * exchangeRates.BTC.USDT;
  }

  // USDT로 변환
  if (fromQuote === "USDT") {
    if (toQuote === "KRW") return price * exchangeRates.USDT.KRW;
    if (toQuote === "BTC") return price / exchangeRates.BTC.USDT;
  }

  // KRW로 변환
  if (fromQuote === "KRW") {
    if (toQuote === "USDT") return price / exchangeRates.USDT.KRW;
    if (toQuote === "BTC") return price / exchangeRates.BTC.KRW;
  }

  return price;
}

/**
 * 두 거래소 간의 가격 차이(프리미엄) 계산
 */
export const calculatePriceGap = (
  coins: Record<string, CoinData>,
  market: Market,
  exchangePair: ExchangePair,
  exchangeRates: {
    USDT: { KRW: number };
    BTC: { KRW: number; USDT: number };
  }
) => {
  try {
    let fromPriceInKRW = market.price;
    let toPriceInKRW = 0;

    // 출발 거래소 가격을 원화로 변환
    if (exchangePair.fromBase === "USDT") {
      fromPriceInKRW = market.price * exchangeRates.USDT.KRW;
    } else if (exchangePair.fromBase === "BTC") {
      // 해당 거래소의 실제 BTC-KRW 가격 사용
      const btcPrice = coins["BTC-KRW"]?.[exchangePair.from]?.price || 0;
      fromPriceInKRW = market.price * btcPrice;
    }

    // 도착 거래소 가격을 원화로 변환
    const [baseToken] = market.symbol.split("-");
    const toMarketSymbol = `${baseToken}-${exchangePair.toBase}`;
    const toPrice = coins[toMarketSymbol]?.[exchangePair.to]?.price || 0;

    if (exchangePair.toBase === "USDT") {
      toPriceInKRW = toPrice * exchangeRates.USDT.KRW;
    } else if (exchangePair.toBase === "BTC") {
      // 도착 거래소의 실제 BTC-KRW 가격 사용
      const btcPrice = coins["BTC-KRW"]?.[exchangePair.to]?.price || 0;
      toPriceInKRW = toPrice * btcPrice;
    } else {
      toPriceInKRW = toPrice;
    }

    // 프리미엄 계산 (양쪽 모두 0이 아닌 경우에만)
    if (fromPriceInKRW === 0 || toPriceInKRW === 0) return 0;
    return ((fromPriceInKRW - toPriceInKRW) / toPriceInKRW) * 100;
  } catch (error) {
    console.error("Error calculating price gap:", error);
    return 0;
  }
};

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}
