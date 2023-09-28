import Prisma from "@prisma/client";
import metrics from "../metrics.js";

let prisma = new Prisma.PrismaClient().$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const metricKey = `${operation}_${model}`;
      try {
        const start = new Date().getTime();
        const queryResult = await query(args);
        const time = new Date().getTime() - start;

        metrics.timing(metricKey, time);

        return queryResult;
      } catch (err) {
        metrics.increment(`errors.${metricKey}`, 1);
      }
      return;
    }
  }
});

export default prisma;
