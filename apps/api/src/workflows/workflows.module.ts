import {
  ContactController,
  OperationsController,
} from "./operations.controller";
import { Module } from "@nestjs/common";
import { SearchModule } from "../search/search.module";
import { WorkflowsService } from "./workflows.service";
@Module({
  imports: [SearchModule],
  controllers: [ContactController, OperationsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
