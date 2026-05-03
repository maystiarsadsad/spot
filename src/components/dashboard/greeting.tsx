"use client";

import { useState, useEffect } from "react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Hola");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <>
      {greeting}, {name} 👋
    </>
  );
}
