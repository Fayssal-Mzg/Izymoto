// middleware.js (à la racine de votre projet)
import { NextResponse } from "next/server";

export function middleware(request) {
  // Cette fonction sera exécutée pour chaque requête
  return NextResponse.next();
}
