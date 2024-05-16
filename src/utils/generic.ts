

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export function wrapAround(value: number, size: number): number {
    return ((value % size) + size) % size;
}

