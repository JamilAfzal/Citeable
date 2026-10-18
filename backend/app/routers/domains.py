import uuid

from fastapi import APIRouter, Depends, Response, status

from app.deps import get_current_user, get_domain_service
from app.models import User
from app.schemas.domain import CompetitorCreate, CompetitorOut, DomainCreate, DomainOut, DomainUpdate
from app.services.domain_service import DomainService

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("", response_model=list[DomainOut])
async def list_domains(user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    return await svc.list(user)


@router.post("", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
async def create_domain(body: DomainCreate, user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    return await svc.create(user, body)


@router.get("/{domain_id}", response_model=DomainOut)
async def get_domain(domain_id: uuid.UUID, user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    return await svc.get(user, domain_id)


@router.patch("/{domain_id}", response_model=DomainOut)
async def update_domain(domain_id: uuid.UUID, body: DomainUpdate, user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    return await svc.update(user, domain_id, body)


@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_domain(domain_id: uuid.UUID, user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    await svc.delete(user, domain_id)
    return Response(status_code=204)


@router.post("/{domain_id}/competitors", response_model=CompetitorOut, status_code=status.HTTP_201_CREATED)
async def add_competitor(domain_id: uuid.UUID, body: CompetitorCreate, user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    return await svc.add_competitor(user, domain_id, body)


@router.delete("/{domain_id}/competitors/{competitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_competitor(domain_id: uuid.UUID, competitor_id: uuid.UUID, user: User = Depends(get_current_user), svc: DomainService = Depends(get_domain_service)):
    await svc.remove_competitor(user, domain_id, competitor_id)
    return Response(status_code=204)
