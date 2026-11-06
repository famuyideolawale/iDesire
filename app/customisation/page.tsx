import { permanentRedirect } from "next/navigation";

// Souvenirs and personalisation now live with Kokies World of Gifts.
export default function Customisation() {
  permanentRedirect("/kokies-world-of-gift/personalisation");
}
