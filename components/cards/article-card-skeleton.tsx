import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function ArticleCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2 border-t bg-transparent">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-8" />
      </CardFooter>
    </Card>
  )
}

export { ArticleCardSkeleton }
