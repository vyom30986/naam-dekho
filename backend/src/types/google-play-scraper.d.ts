declare module "google-play-scraper" {
  interface GPlayApp {
    title: string;
    appId: string;
    developer: string;
    url: string;
    scoreText?: string;
  }
  interface GPlaySearchOptions {
    term: string;
    num?: number;
    country?: string;
    lang?: string;
  }
  const gplay: {
    search(opts: GPlaySearchOptions): Promise<GPlayApp[]>;
  };
  export default gplay;
}
